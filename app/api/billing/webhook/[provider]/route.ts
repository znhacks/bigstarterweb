// app/api/billing/webhook/[provider]/route.ts

import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const providerName = provider;

  try {
    const paymentProvider = PaymentFactory.getProvider(providerName);
    const result = await paymentProvider.handleWebhook(req);

    const {
      eventType,
      tenantId,
      planId,
      endsAt,
      status,
      providerSubscriptionId,
      providerCustomerId,
      amount,
      currency,
      orderId
    } = result;

    // CETAK LOG DEBUGGING DI KONSOL SERVER:
    console.log("========== WEBHOOK RECEIVED ==========");
    console.log("Provider   :", providerName);
    console.log("Event Type :", eventType);
    console.log("Tenant ID  :", tenantId);
    console.log("Plan ID    :", planId);
    console.log("Ends At    :", endsAt);
    console.log("Status     :", status);
    console.log("======================================");

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in webhook metadata" },
        { status: 400 }
      );
    }

    if (eventType === "subscription.created" || eventType === "subscription.updated") {
      // Eksekusi upsert ke tabel subscriptions
      const { error: upsertError } = await supabaseAdmin.from("subscriptions").upsert(
        {
          tenant_id: tenantId,
          plan_id: planId || "free",
          status: status,
          ends_at: endsAt || null,
          provider: providerName,
          provider_subscription_id: providerSubscriptionId,
          provider_customer_id: providerCustomerId,
          updated_at: new Date().toISOString()
        },
        { onConflict: "tenant_id" }
      );

      // SOLUSI: Lempar error jika operasi database gagal agar terdeteksi di konsol
      if (upsertError) {
        throw new Error(
          `Database Upsert Subscriptions Failed: ${upsertError.message} (Code: ${upsertError.code})`
        );
      }
    } else if (eventType === "subscription.deleted") {
      // 1. Ambil data langganan saat ini untuk memeriksa adanya downgrade tertunda (pending_plan_id)
      const { data: currentSub, error: fetchError } = await supabaseAdmin
        .from("subscriptions")
        .select("pending_plan_id, provider")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Database Fetch Subscription Failed: ${fetchError.message}`);
      }

      if (currentSub?.pending_plan_id) {
        // SKENARIO A: Ada downgrade tertunda, pindahkan tenant ke paket baru tersebut secara otomatis
        const { error: downgradeError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan_id: currentSub.pending_plan_id,
            status: "active",
            ends_at: null, // Di-set null jika downgrade ke free, atau hitung siklus baru jika paid downgrade
            cancel_at_period_end: false,
            pending_plan_id: null, // Kosongkan kembali kolom penampung
            updated_at: new Date().toISOString()
          })
          .eq("tenant_id", tenantId);

        if (downgradeError) {
          throw new Error(`Database Process Downgrade Failed: ${downgradeError.message}`);
        }
      } else {
        // SKENARIO B: Tidak ada downgrade tertunda, matikan langganan (kembali ke paket free)
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
      const { error: txError } = await supabaseAdmin.from("transactions").upsert(
        {
          tenant_id: tenantId,
          amount: amount || 0,
          currency: currency || "IDR",
          plan_name: planId || "pro",
          order_id: orderId || `TX-${Date.now()}`,
          status: "paid",
          provider: providerName,
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
    // Seluruh error (termasuk error Supabase) sekarang akan tercetak jelas di sini
    console.error(`Webhook Error [${providerName}]:`, error.message || error);
    return NextResponse.json({ error: error.message || "Webhook Handler Error" }, { status: 500 });
  }
}
