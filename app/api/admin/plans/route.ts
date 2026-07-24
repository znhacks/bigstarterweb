// app/api/admin/plans/route.ts

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

/**
 * FUNGSI PEMBANTU: Memvalidasi apakah pemanggil adalah Superadmin
 */
async function validateSuperadmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) throw new Error("Invalid token");

  // KOREKSI ARSITEKTUR: Membaca kolom is_superadmin langsung dari tabel profiles (System Role)
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

/**
 * 1. GET: Menarik seluruh paket (aktif maupun non-aktif) untuk Konsol Admin
 */
export async function GET(req: Request) {
  try {
    await validateSuperadmin(req);

    // Ambil seluruh plans
    const { data: plans, error: plansErr } = await (
      await planRepository(supabaseAdmin)
    )
      .query()
      .select("*")
      .order("created_at", { ascending: true });

    if (plansErr) throw plansErr;

    // Ambil seluruh plan_prices
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

/**
 * 2. POST: Menyimpan paket baru atau memperbarui paket lama beserta harga & gateway-nya (UPSERT)
 */
export async function POST(req: Request) {
  try {
    await validateSuperadmin(req);
    const body = await req.json();

    const { id, name, description, isActive, displayFeatures, features, prices, isEnterprise, isRecommended, trialDays } = body;

    if (!id || !name || !description) {
      return NextResponse.json(
        { error: "ID, Nama, dan Deskripsi paket wajib diisi" },
        { status: 400 }
      );
    }

    // A. Upsert ke tabel 'plans'
    const normalizedId = id.toLowerCase().trim();
    const { error: planErr } = await (await planRepository(supabaseAdmin)).query().upsert({
      id: normalizedId,
      name,
      description,
      is_active: isActive !== undefined ? isActive : true,
      is_enterprise: isEnterprise ?? false,
      is_recommended: isRecommended ?? false,
      trial_days: trialDays ?? 0,
      display_features: displayFeatures || [],
      features: features || [], // Menyimpan array rbac terpadu: ['allowPdfFormat', 'limit:maxTasks:2000']
      updated_at: new Date().toISOString()
    });

    if (planErr) throw planErr;

    // Invalidasi cache gating agar perubahan fitur langsung efektif (best-effort, per-instance)
    invalidatePlanCache(normalizedId);

    // B. Upsert harga Bulanan (monthly) ke tabel 'plan_prices'
    const planPriceRepo = await planPriceRepository(supabaseAdmin);
    if (prices?.monthly) {
      const { error: mPriceErr } = await planPriceRepo.query().upsert(
        {
          plan_id: normalizedId,
          interval: "monthly",
          amount: prices.monthly.amount,
          currency: prices.monthly.currency || "IDR",
          provider_ids: prices.monthly.providerIds || {}
        },
        { onConflict: "plan_id,interval" }
      );

      if (mPriceErr) throw mPriceErr;
    }

    // C. Upsert harga Tahunan (yearly) ke tabel 'plan_prices'
    if (prices?.yearly) {
      const { error: yPriceErr } = await planPriceRepo.query().upsert(
        {
          plan_id: normalizedId,
          interval: "yearly",
          amount: prices.yearly.amount,
          currency: prices.yearly.currency || "IDR",
          provider_ids: prices.yearly.providerIds || {}
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

/**
 * 3. DELETE: Menonaktifkan paket (soft-delete) atau menghapusnya secara permanen dari database
 */
export async function DELETE(req: Request) {
  try {
    await validateSuperadmin(req);
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("id");
    const action = searchParams.get("action"); // Mengambil parameter aksi

    if (!planId) {
      return NextResponse.json({ error: "ID paket wajib dikirimkan" }, { status: 400 });
    }

    // Proteksi keamanan: Periksa apakah ada pelanggan yang sedang aktif di paket ini
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
      // PROSES HAPUS FISIK PERMANEN DARI DATABASE
      const { error: deleteErr } = await (
        await planRepository(supabaseAdmin)
      )
        .query()
        .delete()
        .eq("id", planId);

      if (deleteErr) throw deleteErr;
    } else {
      // PROSES NON-AKTIFKAN SAJA (SOFT-DELETE)
      const { error: deactivateErr } = await (
        await planRepository(supabaseAdmin)
      )
        .query()
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", planId);

      if (deactivateErr) throw deactivateErr;
    }

    // Invalidasi cache gating (konsistensi, best-effort per-instance)
    invalidatePlanCache(planId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Plans Delete Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
