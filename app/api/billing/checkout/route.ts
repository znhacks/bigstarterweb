// app/api/billing/checkout/route.ts

import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
import { createClient } from "@supabase/supabase-js";
import { plans } from "@/config/billing";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planId, interval, provider, tenantId, successUrl, cancelUrl } = body;

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

    const targetPlan = plans.find((p) => p.id === planId);
    if (!targetPlan) {
      return NextResponse.json({ error: "Selected plan not found" }, { status: 400 });
    }

    // 1. KALKULASI PRO-RATA SECARA AMAN DI SISI SERVER
    let credit = 0;

    // Ambil data langganan aktif saat ini dari database
    const { data: activeSub } = await supabaseAdmin
      .from("subscriptions")
      .select("starts_at, ends_at, plan_id")
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

        const activePlanConfig = plans.find((p) => p.id === activeSub.plan_id);
        if (activePlanConfig) {
          // Ambil harga dasar asli di config (selalu dalam IDR)
          const originalPrice =
            interval === "yearly"
              ? activePlanConfig.prices.yearly.amount
              : activePlanConfig.prices.monthly.amount;

          const remainingRatio = remainingTime / totalDuration;
          credit = remainingRatio * originalPrice;
        }
      }
    }

    // Hitung harga final yang harus dibayar (Harga paket tujuan dikurangi sisa kredit)
    const targetPrice =
      interval === "yearly" ? targetPlan.prices.yearly.amount : targetPlan.prices.monthly.amount;

    const finalPriceInIdr = Math.max(1, parseFloat((targetPrice - credit).toFixed(2)));

    // 2. Ambil adapter pembayaran yang sesuai
    const paymentProvider = PaymentFactory.getProvider(provider);

    // 3. Jalankan checkout dengan mengirimkan nominal harga kustom yang sudah terpotong pro-rata
    const session = await paymentProvider.createCheckoutSession({
      tenantId,
      userId: user.id,
      userEmail: user.email || "",
      planId,
      interval,
      customPrice: finalPriceInIdr, // Mengirimkan harga aman ter-kalkulasi ke adapter
      successUrl: successUrl || `${req.headers.get("origin")}/dashboard/billing?success=true`,
      cancelUrl: cancelUrl || `${req.headers.get("origin")}/dashboard/billing?canceled=true`
    });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Checkout API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
