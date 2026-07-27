import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
import { isTenantMember, canManageBilling } from "@/lib/billing/tenant-auth";
import { createClient } from "@supabase/supabase-js";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { resolveBillingOwner, ownerFilter } from "@/lib/billing/owner";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
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

    const body = await req.json();
    const { tenantId } = body;
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId wajib diisi" }, { status: 400 });
    }

    const isMember = await isTenantMember(supabaseAdmin, user.id, tenantId);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden: bukan anggota tenant" }, { status: 403 });
    }

    const canBilling = await canManageBilling(supabaseAdmin, user.id, tenantId);
    if (!canBilling) {
      return NextResponse.json(
        { error: "Forbidden: tidak memiliki izin mengelola billing tenant" },
        { status: 403 }
      );
    }

    const owner = resolveBillingOwner({ tenantId, userId: user.id });
    if (!owner) {
      return NextResponse.json({ error: "Owner tidak teridentifikasi" }, { status: 400 });
    }
    const { column: ownerCol, value: ownerId } = ownerFilter(owner);

    const subscriptionRepo = await subscriptionRepository(supabaseAdmin);
    const { data: activeSub, error: subError } = await subscriptionRepo
      .query()
      .select("id, provider, provider_subscription_id, cancel_at_period_end")
      .eq(ownerCol, ownerId)
      .eq("status", "active")
      .maybeSingle();

    if (subError) throw subError;
    if (!activeSub) {
      return NextResponse.json(
        { error: "Tidak ditemukan langganan aktif untuk tenant ini" },
        { status: 400 }
      );
    }

    if (activeSub.provider && activeSub.provider_subscription_id) {
      try {
        const paymentProvider = PaymentFactory.getProvider(activeSub.provider);
        await paymentProvider.cancelSubscription(activeSub.provider_subscription_id);
      } catch (cancelErr: any) {
        console.warn(`[cancel-subscription] Gateway cancel gagal: ${cancelErr?.message}`);
      }
    }

    const { error: updateError } = await subscriptionRepo
      .query()
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", activeSub.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cancel Subscription API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
