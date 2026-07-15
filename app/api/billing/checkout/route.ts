// app/api/billing/checkout/route.ts

import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
import { isTenantMember } from "@/lib/billing/tenant-auth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planId, interval, provider, tenantId, successUrl, cancelUrl, couponCode } = body;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Cegah IDOR: pastikan user adalah anggota tenant yg dimanipulasi
    const isMember = await isTenantMember(supabaseAdmin, user.id, tenantId);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden: bukan anggota tenant" }, { status: 403 });
    }

    // 1. TARIK HARGA TARGET + ID PROVIDER DARI DATABASE (single source of truth)
    const { data: dbTargetPrice, error: targetPriceErr } = await supabaseAdmin
      .from("plan_prices")
      .select("amount, plan_id, provider_ids")
      .eq("plan_id", planId)
      .eq("interval", interval)
      .maybeSingle();

    if (targetPriceErr || !dbTargetPrice) {
      return NextResponse.json(
        { error: `Harga untuk paket ${planId} dengan interval ${interval} tidak ditemukan.` },
        { status: 400 }
      );
    }

    const targetPrice = parseFloat(dbTargetPrice.amount);

    // Ambil ID plan di sisi provider dari JSONB provider_ids
    const providerPriceId =
      dbTargetPrice.provider_ids && dbTargetPrice.provider_ids[provider]
        ? dbTargetPrice.provider_ids[provider]
        : null;

    // Ambil nama plan untuk deskripsi invoice
    const { data: planRow } = await supabaseAdmin
      .from("plans")
      .select("name")
      .eq("id", planId)
      .maybeSingle();
    const planName = planRow?.name || planId;

    // 2. KALKULASI KREDIT PRO-RATA DINAMIS (pakai interval langganan LAMA)
    let credit = 0;
    let oldProviderSubscriptionId: string | null = null;
    const { data: activeSub } = await supabaseAdmin
      .from("subscriptions")
      .select("starts_at, ends_at, plan_id, provider, provider_subscription_id, interval")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .maybeSingle();

    if (activeSub && activeSub.starts_at && activeSub.ends_at) {
      const now = Date.now();
      const start = new Date(activeSub.starts_at).getTime();
      const end = new Date(activeSub.ends_at).getTime();

      if (now < end) {
        const totalDuration = end - start;
        const remainingTime = end - now;

        // FIX BUG: gunakan interval langganan LAMA (bukan interval baru yg diminta)
        const oldInterval = activeSub.interval;
        if (oldInterval) {
          const { data: dbOldPrice } = await supabaseAdmin
            .from("plan_prices")
            .select("amount")
            .eq("plan_id", activeSub.plan_id)
            .eq("interval", oldInterval)
            .maybeSingle();

          if (dbOldPrice) {
            const originalPrice = parseFloat(dbOldPrice.amount);
            const remainingRatio = remainingTime / totalDuration;
            credit = remainingRatio * originalPrice;
          }
        }
      }

      // Simpan referensi subscription lama untuk dicegah orphan-nya (lihat langkah 5)
      if (activeSub.provider_subscription_id) {
        oldProviderSubscriptionId = activeSub.provider_subscription_id;
      }
    }

    let finalPriceInIdr = targetPrice - credit;

    // 3. VALIDASI KUPON DISKON DI SISI SERVER (lookup .ilike — mendukung mixed-case)
    let discountAmount = 0;
    if (couponCode) {
      const formattedCode = couponCode.trim();

      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .ilike("code", formattedCode)
        .maybeSingle();

      if (coupon) {
        const isValidDate = !coupon.valid_until || new Date() < new Date(coupon.valid_until);
        const isValidQuota =
          coupon.max_redemptions === null || coupon.redeemed_count < coupon.max_redemptions;

        if (isValidDate && isValidQuota) {
          if (coupon.discount_type === "percentage") {
            discountAmount = (parseFloat(coupon.discount_value) / 100) * finalPriceInIdr;
          } else if (coupon.discount_type === "fixed_amount") {
            discountAmount = parseFloat(coupon.discount_value);
          }
          finalPriceInIdr = finalPriceInIdr - discountAmount;
        }
      }
    }

    const secureFinalPrice = Math.max(1, parseFloat(finalPriceInIdr.toFixed(2)));

    // 4. Ambil adapter pembayaran yang sesuai
    const paymentProvider = PaymentFactory.getProvider(provider);

    // 4b. CEGAH ORPHAN SUBSCRIPTION: bila ada langganan aktif lama, batalkan di gateway-nya.
    // Cancel = berhenti perpanjangan; siklus berjalan tetap sampai jatuh tempo. Pro-rata credit
    // sudah mengkompensasi sisa waktu. Non-blocking: kegagalan cancel tidak membatalkan checkout.
    // Penting: gunakan adapter provider LAMA (bisa beda dgn provider baru) agar cross-provider
    // switch (mis. PayPal -> Midtrans) tidak meninggalkan sub lama tetap menagih (double-charge).
    if (oldProviderSubscriptionId && activeSub?.provider) {
      try {
        const oldAdapter =
          activeSub.provider === provider
            ? paymentProvider
            : PaymentFactory.getProvider(activeSub.provider);
        await oldAdapter.cancelSubscription(oldProviderSubscriptionId);
      } catch (cancelErr) {
        console.warn(
          `[checkout] Gagal membatalkan subscription lama (${oldProviderSubscriptionId}, provider ${activeSub.provider}):`,
          cancelErr
        );
      }
    }

    // 5. Jalankan checkout menggunakan harga kustom yang sudah dipotong pro-rata + kupon diskon
    const session = await paymentProvider.createCheckoutSession({
      tenantId,
      userId: user.id,
      userEmail: user.email || "",
      planId,
      planName,
      interval,
      baseAmount: targetPrice,
      currency: "IDR",
      customPrice: secureFinalPrice,
      providerPriceId: providerPriceId || undefined,
      couponCode: couponCode ? couponCode.trim() : undefined,
      successUrl: successUrl || `${req.headers.get("origin")}/dashboard/billing?success=true`,
      cancelUrl: cancelUrl || `${req.headers.get("origin")}/dashboard/billing?canceled=true`
    });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Checkout API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
