import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Menggunakan service role key agar bypass RLS saat menulis data krusial sistem penagihan
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { orderId, tenantId, planId, billingCycle } = await req.json();

    if (!orderId || !tenantId || !planId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Verifikasi Order ke API PayPal (Sandbox / Live)
    const authRequest = await fetch(
      `${process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com"}/v1/oauth2/token`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Language": "en_US",
          Authorization: `Basic ${Buffer.from(
            `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
          ).toString("base64")}`
        },
        body: "grant_type=client_credentials"
      }
    );

    const { access_token } = await authRequest.json();

    const orderRequest = await fetch(
      `${process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com"}/v2/checkout/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );

    const orderDetails = await orderRequest.json();

    if (orderDetails.status !== "APPROVED" && orderDetails.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment not approved" }, { status: 400 });
    }

    // Ambil detail plan dari database
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const finalAmount = billingCycle === "yearly" ? plan.price * 12 : plan.price;

    // 2. Simpan transaksi ke Database secara aman via Admin Client
    const { error: txError } = await supabaseAdmin.from("transactions").insert({
      tenant_id: tenantId,
      amount: finalAmount,
      plan_name: plan.name,
      order_id: orderId,
      status: "completed"
    });

    if (txError) throw txError;

    // Hitung tanggal masa aktif
    const endsAt = new Date();
    if (billingCycle === "yearly") {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    } else {
      endsAt.setMonth(endsAt.getMonth() + 1);
    }

    // Update status langganan organisasi
    const { error: subError } = await supabaseAdmin.from("subscriptions").upsert(
      {
        tenant_id: tenantId,
        plan_id: planId,
        status: "active",
        cancel_at_period_end: false,
        starts_at: new Date().toISOString(),
        ends_at: endsAt.toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: "tenant_id" }
    );

    if (subError) throw subError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Verification error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
