// app/api/webhooks/billing/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Memaksa rute dievaluasi secara dinamis saat runtime (mencegah error build statis)
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Inisialisasi di dalam handler untuk mencegah error "supabaseUrl is required" saat build-time
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
  );

  try {
    const event = await req.json();

    // Contoh penanganan webhook PayPal / Stripe
    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.CANCELLED": {
        const subscriptionId = event.resource.id;

        // Nonaktifkan subscription di database
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("id", subscriptionId);
        break;
      }

      case "BILLING.SUBSCRIPTION.EXPIRED": {
        const subscriptionId = event.resource.id;

        await supabase.from("subscriptions").update({ status: "expired" }).eq("id", subscriptionId);
        break;
      }

      case "PAYMENT.SALE.COMPLETED": {
        const tenantId = event.resource.custom_id; // Biasanya dikirim via custom_id payload
        const amount = event.resource.amount.total;

        // Catat riwayat transaksi sukses baru
        await supabase.from("transactions").insert({
          tenant_id: tenantId,
          amount: parseFloat(amount),
          plan_name: "Pro", // Atur dinamis sesuai payload
          order_id: event.resource.id,
          status: "completed"
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
