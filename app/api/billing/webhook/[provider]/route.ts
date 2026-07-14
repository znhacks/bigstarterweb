// app/api/billing/webhook/[provider]/route.ts

import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * FUNGSI PEMBANTU: Menghitung perkiraan potongan biaya administrasi riil dari ke-8 gateway (Tetap Sama)
 */
function calculateGatewayFee(amount: number, provider: string, currency: string = "IDR"): number {
  const p = provider.toLowerCase().trim();

  if (p === "stripe") {
    return amount * 0.029 + (currency === "USD" ? 0.3 : 5000); // 2.9% + $0.30
  }
  if (p === "paypal" || p === "braintree") {
    return amount * 0.034 + (currency === "USD" ? 0.3 : 5000); // 3.4% + $0.30
  }
  if (p === "paddle" || p === "lemonsqueezy") {
    return amount * 0.05 + (currency === "USD" ? 0.5 : 7500); // 5% + $0.50 (SaaS MoR standard)
  }
  if (p === "midtrans" || p === "xendit" || p === "mayar") {
    return 4000; // Rata-rata flat fee untuk Virtual Account & QRIS lokal Indonesia
  }
  return 0;
}

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const providerName = provider;

  try {
    const paymentProvider = PaymentFactory.getProvider(providerName);
    const result = await paymentProvider.handleWebhook(req);

    const {
      eventType,
      tenantId,
      planId, // ID paket bawaan dari adapter (jika terdeteksi)
      startsAt,
      endsAt,
      status,
      providerSubscriptionId,
      providerCustomerId,
      amount,
      currency,
      orderId,
      taxAmount,
      feeAmount
    } = result;

    console.log("========== WEBHOOK RECEIVED ==========");
    console.log("Provider   :", providerName);
    console.log("Event Type :", eventType);
    console.log("Tenant ID  :", tenantId);
    console.log("Plan ID    :", planId);
    console.log("Status     :", status);
    console.log("======================================");

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in webhook metadata" },
        { status: 400 }
      );
    }

    const normalizedStatus = status.toLowerCase().trim();
    let finalPlanId = planId;

    // =========================================================================
    // SINKRONISASI DATABASE DINAMIS (Pencarian JSONB Kueri Baru)
    // Jika planId dari adapter kosong, kueri database secara dinamis menggunakan Price ID eksternal
    // =========================================================================
    if (!finalPlanId && providerSubscriptionId) {
      const externalPriceId = providerSubscriptionId;

      const { data: priceRecord, error: priceErr } = await supabaseAdmin
        .from("plan_prices")
        .select("plan_id")
        // Mencari langsung di kolom JSONB provider_ids berdasarkan nama provider aktif
        .or(`provider_ids->>${providerName}.eq.${externalPriceId}`)
        .maybeSingle();

      if (!priceErr && priceRecord) {
        finalPlanId = priceRecord.plan_id;
      }
    }

    if (eventType === "subscription.created" || eventType === "subscription.updated") {
      if (normalizedStatus === "approval_pending" || normalizedStatus === "pending") {
        console.log(
          `[Webhook Ignored] Mengabaikan event karena status transaksi masih pending (${normalizedStatus}) untuk tenant: ${tenantId}`
        );
        return NextResponse.json({
          received: true,
          ignored: true,
          reason: "Transaksi belum dibayar (status pending). Database aman dan tidak diubah."
        });
      }

      const { error: upsertError } = await supabaseAdmin.from("subscriptions").upsert(
        {
          tenant_id: tenantId,
          plan_id: finalPlanId || "free", // Menggunakan ID paket hasil kueri dinamis
          status: normalizedStatus,
          starts_at: startsAt || new Date().toISOString(),
          ends_at: endsAt || null,
          provider: providerName,
          provider_subscription_id: providerSubscriptionId,
          provider_customer_id: providerCustomerId,
          updated_at: new Date().toISOString(),
          pending_plan_id: null
        },
        { onConflict: "tenant_id" }
      );

      if (upsertError) {
        throw new Error(`Database Upsert Subscriptions Failed: ${upsertError.message}`);
      }
    } else if (eventType === "subscription.deleted") {
      const { data: currentSub, error: fetchError } = await supabaseAdmin
        .from("subscriptions")
        .select("pending_plan_id, provider")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Database Fetch Subscription Failed: ${fetchError.message}`);
      }

      if (currentSub?.pending_plan_id) {
        const { error: downgradeError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan_id: currentSub.pending_plan_id,
            status: "active",
            ends_at: null,
            cancel_at_period_end: false,
            pending_plan_id: null,
            updated_at: new Date().toISOString()
          })
          .eq("tenant_id", tenantId);

        if (downgradeError) {
          throw new Error(`Database Process Downgrade Failed: ${downgradeError.message}`);
        }
      } else {
        const { error: deleteError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan_id: "free",
            status: "expired",
            ends_at: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString()
          })
          .eq("tenant_id", tenantId);

        if (deleteError) {
          throw new Error(`Database Delete Subscription Failed: ${deleteError.message}`);
        }
      }
    } else if (eventType === "payment.succeeded") {
      const grossAmount = amount || 0;
      const activeCurrency = currency || "IDR";

      const calculatedTax =
        taxAmount !== undefined
          ? taxAmount
          : providerName === "midtrans" || providerName === "xendit" || providerName === "mayar"
            ? grossAmount * 0.11
            : 0;

      const calculatedFee =
        feeAmount !== undefined
          ? feeAmount
          : calculateGatewayFee(grossAmount, providerName, activeCurrency);

      const calculatedNet = Math.max(0, grossAmount - calculatedTax - calculatedFee);

      const { error: txError } = await supabaseAdmin.from("transactions").upsert(
        {
          tenant_id: tenantId,
          amount: grossAmount,
          currency: activeCurrency,
          plan_name: finalPlanId || "pro", // Menggunakan ID paket hasil kueri dinamis
          order_id: orderId || `TX-${Date.now()}`,
          status: "paid",
          provider: providerName,
          tax_amount: parseFloat(calculatedTax.toFixed(2)),
          net_amount: parseFloat(calculatedNet.toFixed(2)),
          created_at: new Date().toISOString()
        },
        { onConflict: "order_id" }
      );

      if (txError) {
        throw new Error(`Database Insert Transaction Failed: ${txError.message}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`Webhook Error [${providerName}]:`, error.message || error);
    return NextResponse.json({ error: error.message || "Webhook Handler Error" }, { status: 500 });
  }
}
