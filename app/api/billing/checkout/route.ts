// app/api/billing/checkout/route.ts

import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
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

    // 1. TARIK DATA HARGA TARGET DARI DATABASE SECARA DINAMIS
    const { data: dbTargetPrice, error: targetPriceErr } = await supabaseAdmin
      .from("plan_prices")
      .select("amount, plan_id")
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

    // 2. KALKULASI KREDIT PRO-RATA DINAMIS
    let credit = 0;
    const { data: activeSub } = await supabaseAdmin
      .from("subscriptions")
      .select("starts_at, ends_at, plan_id, provider")
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

        // Tarik harga paket aktif lama dari database untuk kalkulasi sisa kredit
        const { data: dbOldPrice } = await supabaseAdmin
          .from("plan_prices")
          .select("amount")
          .eq("plan_id", activeSub.plan_id)
          .eq("interval", interval)
          .maybeSingle();

        if (dbOldPrice) {
          const originalPrice = parseFloat(dbOldPrice.amount);
          const remainingRatio = remainingTime / totalDuration;
          credit = remainingRatio * originalPrice;
        }
      }
    }

    let finalPriceInIdr = targetPrice - credit;

    // 3. VALIDASI KUPON DISKON DINAMIS DI SISI SERVER
    let discountAmount = 0;
    if (couponCode) {
      const formattedCode = couponCode.trim().toUpperCase();
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", formattedCode)
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

    // 5. Jalankan checkout menggunakan harga kustom yang sudah dipotong pro-rata + kupon diskon
    const session = await paymentProvider.createCheckoutSession({
      tenantId,
      userId: user.id,
      userEmail: user.email || "",
      planId,
      interval,
      customPrice: secureFinalPrice,
      successUrl: successUrl || `${req.headers.get("origin")}/dashboard/billing?success=true`,
      cancelUrl: cancelUrl || `${req.headers.get("origin")}/dashboard/billing?canceled=true`
    });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Checkout API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
