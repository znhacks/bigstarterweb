// services/payment/billing/gating.ts
//
// Subscription gating (RBAC langganan) — kini DB-driven.
// Membaca plans.features[] dari database & men-decode-nya via decodeFeatureGates.
// Tidak lagi bergantung pada config/billing.ts.

import { createClient } from "@supabase/supabase-js";
import {
  decodeFeatureGates,
  FeatureGates,
  FEATURE_DEFINITIONS
} from "@/config/feature-definitions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export interface TenantPlan {
  id: string;
  name: string;
  featureGates: FeatureGates;
}

// Cache decoded feature gates per plan_id (plan jarang berubah; cache mempercepat cek gating).
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit
const featureGatesCache = new Map<string, { name: string; gates: FeatureGates; ts: number }>();

function defaultGates(): FeatureGates {
  return decodeFeatureGates(null); // memakai defaultValue dari FEATURE_DEFINITIONS
}

/**
 * Ambil feature gates sebuah plan dari DB (dengan cache TTL).
 */
async function fetchPlanFeatureGates(
  planId: string
): Promise<{ name: string; gates: FeatureGates } | null> {
  const now = Date.now();
  const cached = featureGatesCache.get(planId);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return { name: cached.name, gates: cached.gates };
  }

  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("name, features, is_active")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) return null;

  const result = { name: plan.name || planId, gates: decodeFeatureGates(plan.features) };
  featureGatesCache.set(planId, { ...result, ts: now });
  return result;
}

/**
 * Mengambil paket langganan aktif milik tenant (dengan feature gates hasil decode dari DB).
 * Jika tidak ada langganan aktif / kedaluwarsa → paket "free"; bila plan "free" tidak ada
 * di DB, kembalikan defaultValue dari FEATURE_DEFINITIONS.
 */
export async function getTenantPlan(tenantId: string): Promise<TenantPlan> {
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_id, status, ends_at")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const isExpired = subscription?.ends_at ? new Date() > new Date(subscription.ends_at) : false;
  const isActive = subscription && subscription.status === "active" && !isExpired;
  const planId = (isActive && subscription?.plan_id) || "free";

  const fetched = await fetchPlanFeatureGates(planId);
  if (fetched) {
    return { id: planId, name: fetched.name, featureGates: fetched.gates };
  }

  // Plan tidak ditemukan di DB → pakai default gates
  return { id: planId, name: planId, featureGates: defaultGates() };
}

/**
 * Memvalidasi apakah tenant memiliki akses ke suatu fitur boolean (mis. 'allowPdfFormat')
 */
export async function hasFeature(
  tenantId: string,
  featureKey: keyof Omit<FeatureGates, "maxUsers" | "maxTasks">
): Promise<boolean> {
  const plan = await getTenantPlan(tenantId);
  return plan.featureGates[featureKey] === true;
}

/**
 * Mengambil batas kuota angka dari suatu fitur (mis. 'maxTasks', 'maxUsers')
 */
export async function getFeatureLimit(
  tenantId: string,
  limitKey: "maxUsers" | "maxTasks"
): Promise<number> {
  const plan = await getTenantPlan(tenantId);
  return plan.featureGates[limitKey] ?? 0;
}

/** Invalidasi cache untuk sebuah plan (panggil setelah admin memperbarui plan). */
export function invalidatePlanCache(planId?: string): void {
  if (planId) featureGatesCache.delete(planId);
  else featureGatesCache.clear();
}

// Daftar key numerik (untuk referensi / enforcer)
export const NUMERIC_FEATURE_KEYS = FEATURE_DEFINITIONS.filter((f) => f.type === "number").map(
  (f) => f.key
) as (keyof FeatureGates)[];
