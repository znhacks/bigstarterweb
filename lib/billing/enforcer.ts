// lib/billing/enforcer.ts
//
// Enforcer batas seat & usage — kini DB-driven via getTenantPlan (decode plans.features).
// FIX BUG sebelumnya: membaca planConfig.maxUsers/maxTasks dari root plan (undefined) sehingga
// selalu fallback ke default (2 seat, 100 task). Sekarang membaca featureGates.maxUsers/maxTasks.

import { supabaseAdmin } from "@/lib/api/supabase-server";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { screenshotLogRepository } from "@/supabase/repositories/screenshot-logs";
import { getTenantPlan } from "@/services/payment/billing/gating";

interface LimitCheckResult {
  allowed: boolean;
  current: number;
  max: number;
  planName: string;
}

export async function checkSeatLimit(tenantId: string): Promise<LimitCheckResult> {
  const plan = await getTenantPlan(tenantId);

  const membershipRepo = await membershipRepository(supabaseAdmin);
  const { count, error } = await membershipRepo
    .query()
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (error) throw error;

  const currentSeats = count || 0;
  const maxSeats = plan.featureGates.maxUsers ?? 2;

  return {
    allowed: currentSeats < maxSeats,
    current: currentSeats,
    max: maxSeats,
    planName: plan.name
  };
}

export async function checkUsageLimit(tenantId: string): Promise<LimitCheckResult> {
  const plan = await getTenantPlan(tenantId);

  // Hitung penggunaan fitur di bulan kalender berjalan saat ini
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // Catatan: 'screenshot_logs' adalah tabel pencatatan aktivitas fitur (usage metering).
  const screenshotLogRepo = await screenshotLogRepository(supabaseAdmin);
  const { count, error } = await screenshotLogRepo
    .query()
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", startOfMonth);

  if (error) throw error;

  const currentUsage = count || 0;
  const maxUsage = plan.featureGates.maxTasks ?? 100;

  return {
    allowed: currentUsage < maxUsage,
    current: currentUsage,
    max: maxUsage,
    planName: plan.name
  };
}
