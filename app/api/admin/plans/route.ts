import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { invalidatePlanCache } from "@/services/payment/billing/gating";
import { profileRepository } from "@/supabase/repositories/profiles";
import { planRepository } from "@/supabase/repositories/plans";
import { planPriceRepository } from "@/supabase/repositories/plan-pices";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function validateSuperadmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) throw new Error("Invalid token");

  const { data: profile, error: profileErr } = await (
    await profileRepository(supabaseAdmin)
  )
    .query()
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr || !profile || profile.is_superadmin !== true) {
    throw new Error("Forbidden: Hanya Superadmin yang diizinkan");
  }

  return user;
}

export async function GET(req: Request) {
  try {
    await validateSuperadmin(req);

    const { data: plans, error: plansErr } = await (
      await planRepository(supabaseAdmin)
    )
      .query()
      .select("*")
      .order("created_at", { ascending: true });

    if (plansErr) throw plansErr;

    const { data: prices, error: pricesErr } = await (
      await planPriceRepository(supabaseAdmin)
    )
      .query()
      .select("*");

    if (pricesErr) throw pricesErr;

    return NextResponse.json({ success: true, plans, prices });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      {
        status:
          error.message === "Unauthorized"
            ? 401
            : error.message.includes("Hanya Superadmin")
              ? 403
              : 500
      }
    );
  }
}

export async function POST(req: Request) {
  try {
    await validateSuperadmin(req);
    const body = await req.json();

    const {
      id,
      name,
      description,
      isActive,
      displayFeatures,
      features,
      prices,
      isEnterprise,
      isRecommended,
      trialDays,
      sortOrder,
      sort_order,
      weight,
      resolveConflict
    } = body;

    if (!id || !name || !description) {
      return NextResponse.json(
        { error: "ID, Nama, dan Deskripsi paket wajib diisi" },
        { status: 400 }
      );
    }

    const normalizedId = id.toLowerCase().trim();

    const resolvedSortOrder =
      sort_order !== undefined
        ? sort_order
        : sortOrder !== undefined
          ? sortOrder
          : weight !== undefined
            ? weight
            : 0;

    if (resolveConflict === true && resolvedSortOrder > 0) {
      const { data: conflictingPlans, error: getConflictingErr } = await supabaseAdmin
        .from("plans")
        .select("id, sort_order, weight")
        .gte("sort_order", resolvedSortOrder)
        .neq("id", normalizedId);

      if (getConflictingErr) throw getConflictingErr;

      if (conflictingPlans && conflictingPlans.length > 0) {
        const sortedConflicting = conflictingPlans.sort(
          (a, b) => (b.sort_order ?? b.weight ?? 0) - (a.sort_order ?? a.weight ?? 0)
        );

        for (const plan of sortedConflicting) {
          const currentOrder = plan.sort_order ?? plan.weight ?? resolvedSortOrder;
          const nextOrder = currentOrder + 1;

          await supabaseAdmin
            .from("plans")
            .update({
              sort_order: nextOrder,
              weight: nextOrder
            })
            .eq("id", plan.id);
        }
      }
    }

    const { error: planErr } = await (await planRepository(supabaseAdmin)).query().upsert({
      id: normalizedId,
      name,
      description,
      is_active: isActive !== undefined ? isActive : true,
      is_enterprise: isEnterprise ?? false,
      is_recommended: isRecommended ?? false,
      trial_days: trialDays ?? 0,
      sort_order: resolvedSortOrder,
      weight: resolvedSortOrder,
      display_features: displayFeatures || [],
      features: features || [],
      updated_at: new Date().toISOString()
    });

    if (planErr) throw planErr;

    invalidatePlanCache(normalizedId);

    const planPriceRepo = await planPriceRepository(supabaseAdmin);
    if (prices?.monthly) {
      const { error: mPriceErr } = await planPriceRepo.query().upsert(
        {
          plan_id: normalizedId,
          interval: "monthly",
          amount: prices.monthly.amount,
          currency: prices.monthly.currency || "IDR",
          product_id: prices.monthly.productId || null
        },
        { onConflict: "plan_id,interval" }
      );

      if (mPriceErr) throw mPriceErr;
    }

    if (prices?.yearly) {
      const { error: yPriceErr } = await planPriceRepo.query().upsert(
        {
          plan_id: normalizedId,
          interval: "yearly",
          amount: prices.yearly.amount,
          currency: prices.yearly.currency || "IDR",
          product_id: prices.yearly.productId || null
        },
        { onConflict: "plan_id,interval" }
      );

      if (yPriceErr) throw yPriceErr;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Plans Save Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await validateSuperadmin(req);
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("id");
    const action = searchParams.get("action");

    if (!planId) {
      return NextResponse.json({ error: "ID paket wajib dikirimkan" }, { status: 400 });
    }

    const { count, error: countErr } = await (
      await subscriptionRepository(supabaseAdmin)
    )
      .query()
      .select("*", { count: "exact", head: true })
      .eq("plan_id", planId)
      .eq("status", "active");

    if (countErr) throw countErr;

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Gagal menghapus. Paket ini sedang digunakan oleh ${count} pelanggan aktif.` },
        { status: 400 }
      );
    }

    if (action === "delete") {
      const { error: deleteErr } = await (
        await planRepository(supabaseAdmin)
      )
        .query()
        .delete()
        .eq("id", planId);

      if (deleteErr) throw deleteErr;
    } else {
      const { error: deactivateErr } = await (
        await planRepository(supabaseAdmin)
      )
        .query()
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", planId);

      if (deactivateErr) throw deactivateErr;
    }

    invalidatePlanCache(planId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Plans Delete Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
