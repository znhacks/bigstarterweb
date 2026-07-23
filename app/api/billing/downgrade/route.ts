// app/api/billing/downgrade/route.ts

import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
import { isTenantMember } from "@/lib/billing/tenant-auth";
import { createClient } from "@supabase/supabase-js";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, targetPlanId } = body;

    // 1. Dapatkan otorisasi pengguna aktif
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

    // 2. Ambil data langganan aktif saat ini
    const subscriptionRepo = await subscriptionRepository(supabaseAdmin);
    const { data: activeSub, error: subError } = await subscriptionRepo
      .query()
      .select("id, provider, provider_subscription_id")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .single();

    if (subError || !activeSub) {
      return NextResponse.json(
        { error: "Tidak ditemukan langganan aktif untuk tenant ini" },
        { status: 400 }
      );
    }

    // 3. Batalkan perpanjangan otomatis di sisi Gateway Pembayaran (Stripe/PayPal/Paddle)
    if (activeSub.provider && activeSub.provider_subscription_id) {
      const paymentProvider = PaymentFactory.getProvider(activeSub.provider);
      await paymentProvider.cancelSubscription(activeSub.provider_subscription_id);
    }

    // 4. Update tabel subscriptions: simpan target downgrade di pending_plan_id & set cancel_at_period_end
    const { error: updateError } = await subscriptionRepo
      .query()
      .update({
        pending_plan_id: targetPlanId,
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", activeSub.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Downgrade API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
