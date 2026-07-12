// app/api/billing/webhook/[provider]/route.ts
import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
import { createClient } from "@supabase/supabase-js";

// Memaksa rute dievaluasi secara dinamis saat runtime (mencegah error build statis)
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  // Inisialisasi di dalam handler untuk mencegah error "supabaseUrl is required" saat build-time
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
  );

  const { provider } = await params;
  const providerName = provider;

  try {
    // 1. Ambil adapter berdasarkan parameter route secara dinamis
    const paymentProvider = PaymentFactory.getProvider(providerName);

    // 2. Parsing & standardisasi data menggunakan adapter terpilih
    const result = await paymentProvider.handleWebhook(req);

    const {
      eventType,
      tenantId,
      status,
      providerSubscriptionId,
      providerCustomerId,
      amount,
      currency,
      orderId
    } = result;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in webhook metadata" },
        { status: 400 }
      );
    }

    // 3. Sinkronisasi data ke Supabase berdasarkan Event Type
    if (eventType === "subscription.created" || eventType === "subscription.updated") {
      await supabaseAdmin.from("subscriptions").upsert(
        {
          tenant_id: tenantId,
          status: status,
          provider_subscription_id: providerSubscriptionId,
          provider_customer_id: providerCustomerId,
          updated_at: new Date().toISOString()
        },
        { onConflict: "tenant_id" }
      );
    } else if (eventType === "subscription.deleted") {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString()
        })
        .eq("tenant_id", tenantId);
    } else if (eventType === "payment.succeeded") {
      await supabaseAdmin.from("transactions").upsert(
        {
          tenant_id: tenantId,
          amount: amount || 0,
          currency: currency || "IDR",
          plan_name: "SaaS Plan",
          order_id: orderId || `TX-${Date.now()}`,
          status: "paid",
          provider: providerName,
          created_at: new Date().toISOString()
        },
        { onConflict: "order_id" }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`Webhook Error [${providerName}]:`, error);
    return NextResponse.json({ error: error.message || "Webhook Handler Error" }, { status: 500 });
  }
}
