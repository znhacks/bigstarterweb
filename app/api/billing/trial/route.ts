import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isTenantMember, canManageBilling } from "@/lib/billing/tenant-auth";
import { resolveBillingOwner, ownerFilter } from "@/lib/billing/owner";
import { planRepository } from "@/supabase/repositories/plans";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, planId } = body;

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

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId wajib dikirimkan" }, { status: 400 });
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
      return NextResponse.json(
        { error: "Tidak dapat menentukan pemilik billing" },
        { status: 400 }
      );
    }

    const { column, value } = ownerFilter(owner);

    const { data: plan, error: planErr } = await (
      await planRepository(supabaseAdmin)
    )
      .query()
      .select("trial_days, is_enterprise")
      .eq("id", planId)
      .maybeSingle();

    if (planErr) throw planErr;
    if (!plan) {
      return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 400 });
    }

    const trialDays = Number(plan.trial_days) || 0;
    if (trialDays <= 0) {
      return NextResponse.json({ error: "Plan tidak memiliki trial" }, { status: 400 });
    }

    const { data: existingSub } = await (
      await subscriptionRepository(supabaseAdmin)
    )
      .query()
      .select("id, status, provider")
      .eq(column, value)
      .maybeSingle();

    if (
      existingSub &&
      (existingSub.status === "active" ||
        existingSub.status === "trialing" ||
        existingSub.provider === "trial")
    ) {
      return NextResponse.json({ error: "Trial sudah pernah digunakan" }, { status: 409 });
    }

    const now = new Date();
    const ends = new Date();
    ends.setDate(ends.getDate() + trialDays);

    const record: Record<string, any> = {
      plan_id: planId,
      status: "trialing",
      starts_at: now.toISOString(),
      ends_at: ends.toISOString(),
      provider: "trial",
      cancel_at_period_end: true,
      interval: null,
      pending_plan_id: null,
      updated_at: now.toISOString()
    };

    if (owner.type === "tenant") {
      record.tenant_id = owner.id;
      record.user_id = user.id;
    } else {
      record.user_id = owner.id;

      record.tenant_id = tenantId;
    }

    if (existingSub) {
      const { error: updateErr } = await (
        await subscriptionRepository(supabaseAdmin)
      )
        .query()
        .update(record)
        .eq("id", existingSub.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await (
        await subscriptionRepository(supabaseAdmin)
      )
        .query()
        .insert(record);

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ success: true, endsAt: ends.toISOString() });
  } catch (error: any) {
    console.error("Trial API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
