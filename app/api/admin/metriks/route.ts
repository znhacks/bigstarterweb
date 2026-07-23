// app/api/admin/metrics/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { profileRepository } from "@/supabase/repositories/profiles";
import { transactionRepository } from "@/supabase/repositories/transactions";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(req: Request) {
  try {
    // 1. OTORISASI AMAN: Memastikan pemanggil adalah Superadmin
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

    // KOREKSI ARSITEKTUR: Membaca kolom is_superadmin langsung dari tabel profiles (System Role)
    const { data: profile, error: profileErr } = await (await profileRepository(supabaseAdmin))
      .query()
      .select("is_superadmin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.is_superadmin !== true) {
      return NextResponse.json(
        { error: "Hanya akun Superadmin yang diizinkan mengakses halaman ini" },
        { status: 403 }
      );
    }

    // 2. QUERY AGREGASI FINANSIAL: Menghitung Gross, Net, dan Tax
    const transactionRepo = await transactionRepository(supabaseAdmin);
    const { data: txMetrics, error: txErr } = await transactionRepo
      .query()
      .select("amount, net_amount, tax_amount")
      .eq("status", "paid");

    if (txErr) throw txErr;

    let totalGrossRevenue = 0;
    let totalNetRevenue = 0;
    let totalTaxesCollected = 0;

    if (txMetrics) {
      txMetrics.forEach((tx) => {
        totalGrossRevenue += parseFloat(tx.amount?.toString() || "0");
        totalNetRevenue += parseFloat(tx.net_amount?.toString() || "0");
        totalTaxesCollected += parseFloat(tx.tax_amount?.toString() || "0");
      });
    }

    // 3. QUERY LANGGANAN AKTIF: Jumlah pelanggan aktif per paket (Free, Starter, Pro)
    const { data: subMetrics, error: subErr } = await (await subscriptionRepository(supabaseAdmin))
      .query()
      .select("plan_id, status")
      .eq("status", "active");

    if (subErr) throw subErr;

    const planCounts: Record<string, number> = { free: 0, starter: 0, pro: 0 };
    let totalActiveSubscribers = 0;

    if (subMetrics) {
      subMetrics.forEach((sub) => {
        const planId = sub.plan_id?.toLowerCase() || "free";
        planCounts[planId] = (planCounts[planId] || 0) + 1;
        totalActiveSubscribers++;
      });
    }

    // 4. QUERY DAFTAR TRANSAKSI TERBARU (AUDIT HISTORY)
    const { data: recentTransactions, error: recErr } = await transactionRepo
      .query()
      .select("id, tenant_id, amount, currency, plan_name, status, created_at, provider")
      .order("created_at", { ascending: false })
      .limit(10);

    if (recErr) throw recErr;

    // 5. Kembalikan data metrik terstruktur
    return NextResponse.json({
      success: true,
      metrics: {
        totalGrossRevenue: parseFloat(totalGrossRevenue.toFixed(2)),
        totalNetRevenue: parseFloat(totalNetRevenue.toFixed(2)),
        totalTaxesCollected: parseFloat(totalTaxesCollected.toFixed(2)),
        totalActiveSubscribers,
        planDistributions: planCounts
      },
      recentTransactions: recentTransactions || []
    });
  } catch (error: any) {
    console.error("Superadmin Metrics API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
