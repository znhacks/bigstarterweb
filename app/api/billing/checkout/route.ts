// app/api/billing/checkout/route.ts

import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
import { isTenantMember } from "@/lib/billing/tenant-auth";
import { createClient } from "@supabase/supabase-js";
import { planPriceRepository } from "@/supabase/repositories/plan-pices";
import { planRepository } from "@/supabase/repositories/plans";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { couponRepository } from "@/supabase/repositories/coupons";
import { paymentOrderRepository } from "@/supabase/repositories/payment-orders";
import { convertToIdr } from "@/services/exchange-rate";
import { resolveBillingOwner, ownerFilter } from "@/lib/billing/owner";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * Konversi aman ke IDR (base charge). Bila API kurs gagal, anggap nominal sudah dalam IDR
 * agar checkout tidak menggantung. Plan bisa dalam valuta asing (USD/SGD/dll); provider
 * IDR-native menagih dalam IDR sehingga nominal wajib dinormalisasi.
 */
async function convertToIdrSafe(amount: number, fromCurrency: string): Promise<number> {
  try {
    const conv = await convertToIdr(amount, fromCurrency);
    return conv.amountInIdr;
  } catch {
    return amount;
  }
}

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
    const planPriceRepo = await planPriceRepository(supabaseAdmin);
    const { data: dbTargetPrice, error: targetPriceErr } = await planPriceRepo
      .query()
      .select("amount, plan_id, provider_ids, currency")
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
    const planCurrency = (dbTargetPrice as any).currency || "IDR";

    // Ambil ID plan di sisi provider dari JSONB provider_ids
    const providerPriceId =
      dbTargetPrice.provider_ids && dbTargetPrice.provider_ids[provider]
        ? dbTargetPrice.provider_ids[provider]
        : null;

    // Ambil nama plan untuk deskripsi invoice
    const { data: planRow } = await (await planRepository(supabaseAdmin))
      .query()
      .select("name")
      .eq("id", planId)
      .maybeSingle();
    const planName = planRow?.name || planId;

    // 1b. KONVERSI HARGA PLAN KE IDR (base charge). Plan bisa dalam valuta asing
    //     (USD/SGD/dll); provider IDR-native (Xendit/Mayar/Midtrans) menagih dalam IDR,
    //     jadi nominal harus dinormalisasi ke IDR dulu agar currency plan benar2 berpengaruh.
    const chargeAmountIdr = await convertToIdrSafe(targetPrice, planCurrency);

    // Scope billing sesuai billingAttachedTo (tenant default; user bila config "user").
    const owner = resolveBillingOwner({ tenantId, userId: user.id });
    if (!owner) {
      return NextResponse.json({ error: "Owner tidak teridentifikasi" }, { status: 400 });
    }
    const { column: ownerCol, value: ownerId } = ownerFilter(owner);

    // 2. KALKULASI KREDIT PRO-RATA DINAMIS (pakai interval langganan LAMA)
    let credit = 0;
    let oldProviderSubscriptionId: string | null = null;
    const { data: activeSub } = await (await subscriptionRepository(supabaseAdmin))
      .query()
      .select("starts_at, ends_at, plan_id, provider, provider_subscription_id, interval")
      .eq(ownerCol, ownerId)
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
          const { data: dbOldPrice } = await planPriceRepo
            .query()
            .select("amount, currency")
            .eq("plan_id", activeSub.plan_id)
            .eq("interval", oldInterval)
            .maybeSingle();

          if (dbOldPrice) {
            // Normalisasi harga plan LAMA ke IDR juga (bisa beda mata uang dgn plan baru).
            const oldOriginalIdr = await convertToIdrSafe(
              parseFloat(dbOldPrice.amount),
              (dbOldPrice as any).currency || "IDR"
            );
            const remainingRatio = remainingTime / totalDuration;
            credit = remainingRatio * oldOriginalIdr;
          }
        }
      }

      // Simpan referensi subscription lama untuk dicegah orphan-nya (lihat langkah 5)
      if (activeSub.provider_subscription_id) {
        oldProviderSubscriptionId = activeSub.provider_subscription_id;
      }
    }

    // Semua komponen kini dalam IDR: harga plan baru (chargeAmountIdr) & kredit pro-rata.
    let finalChargeIdr = chargeAmountIdr - credit;

    // 3. VALIDASI KUPON DISKON DI SISI SERVER (lookup .ilike — mendukung mixed-case)
    let discountAmount = 0;
    if (couponCode) {
      const formattedCode = couponCode.trim();

      const { data: coupon } = await (await couponRepository(supabaseAdmin))
        .query()
        .select("*")
        .ilike("code", formattedCode)
        .maybeSingle();

      if (coupon) {
        const isValidDate = !coupon.valid_until || new Date() < new Date(coupon.valid_until);
        const isValidQuota =
          coupon.max_redemptions === null || coupon.redeemed_count < coupon.max_redemptions;

        if (isValidDate && isValidQuota) {
          if (coupon.discount_type === "percentage") {
            discountAmount = (parseFloat(coupon.discount_value) / 100) * finalChargeIdr;
          } else if (coupon.discount_type === "fixed_amount") {
            // Diskon fixed_amount diasumsikan dalam IDR (base).
            discountAmount = parseFloat(coupon.discount_value);
          }
          finalChargeIdr = finalChargeIdr - discountAmount;
        }
      }
    }

    const secureFinalPrice = Math.max(1, parseFloat(finalChargeIdr.toFixed(2)));

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
      baseAmount: chargeAmountIdr,
      currency: "IDR",
      customPrice: secureFinalPrice,
      providerPriceId: providerPriceId || undefined,
      couponCode: couponCode ? couponCode.trim() : undefined,
      successUrl: successUrl || `${req.headers.get("origin")}/dashboard/billing?success=true`,
      cancelUrl: cancelUrl || `${req.headers.get("origin")}/dashboard/billing?canceled=true`
    });

    // 6. CATAT INTENT PEMBAYARAN (pending) — sumber otoritatik context untuk webhook.
    //    Webhook melakukan lookup by (provider, provider_order_id = session.sessionId),
    //    yaitu id invoice/order provider yang selalu di-echo pada callback, sehingga
    //    pemulihan context tidak lagi bergantung pada echo metadata/external_id provider.
    try {
      const orderRepo = await paymentOrderRepository(supabaseAdmin);

      // Supersede: tandai order pending lama untuk owner+plan+interval sama menjadi expired.
      await orderRepo
        .query()
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq(ownerCol, ownerId)
        .eq("plan_id", planId)
        .eq("interval", interval)
        .eq("status", "pending");

      await orderRepo.insert({
        tenant_id: tenantId,
        user_id: user.id,
        plan_id: planId,
        interval,
        provider,
        provider_order_id: session.sessionId || null,
        amount: secureFinalPrice,
        charge_currency: "IDR",
        plan_amount: targetPrice,
        plan_currency: planCurrency,
        amount_in_idr: secureFinalPrice,
        coupon_code: couponCode ? couponCode.trim() : null,
        status: "pending"
      });
    } catch (orderErr: any) {
      // Non-blocking: bila gagal mencatat order, webhook akan fallback ke ekstraksi adapter.
      console.warn("[checkout] Gagal mencatat payment_orders:", orderErr?.message || orderErr);
    }

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Checkout API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
