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
import { planRepository } from "@/supabase/repositories/plans";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { billingConfig } from "@/config/payment";
import { ownerFilter, type BillingOwner } from "@/lib/billing/owner";
import { getUser } from "@/lib/auth";

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

/** Semua fitur dimatikan & limit 0 — dipakai saat requireActiveSubscription=true & tak ada sub aktif. */
function deniedGates(): FeatureGates {
  const gates = {} as Record<string, boolean | number>;
  FEATURE_DEFINITIONS.forEach((f) => {
    gates[f.key] = f.type === "boolean" ? false : 0;
  });
  return gates as unknown as FeatureGates;
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

  const { data: plan } = await (await planRepository(supabaseAdmin))
    .query()
    .select("name, features, is_active")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) return null;

  const result = { name: plan.name || planId, gates: decodeFeatureGates(plan.features) };
  featureGatesCache.set(planId, { ...result, ts: now });
  return result;
}

/**
 * Mengambil paket langganan aktif milik sebuah owner (tenant atau user, sesuai config
 * billingAttachedTo) beserta feature gates hasil decode dari DB.
 *
 * Aturan:
 *  - status "active" atau "trialing" & belum kedaluwarsa → dianggap aktif.
 *  - requireActiveSubscription=true & tidak aktif → DENIED (semua fitur off, limit 0).
 *  - selain itu (mode free) → paket "free"; bila tidak ada di DB → default gates.
 */
export async function getBillingPlan(owner: BillingOwner): Promise<TenantPlan> {
  const { column, value } = ownerFilter(owner);
  const { data: subscription } = await (await subscriptionRepository(supabaseAdmin))
    .query()
    .select("plan_id, status, ends_at")
    .eq(column, value)
    .maybeSingle();

  const isExpired = subscription?.ends_at ? new Date() > new Date(subscription.ends_at) : false;
  const isActive =
    !!subscription &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    !isExpired;

  if (!isActive && billingConfig.requireActiveSubscription) {
    return { id: "denied", name: "No Active Subscription", featureGates: deniedGates() };
  }

  const planId = (isActive && subscription?.plan_id) || "free";

  const fetched = await fetchPlanFeatureGates(planId);
  if (fetched) {
    return { id: planId, name: fetched.name, featureGates: fetched.gates };
  }

  // Plan tidak ditemukan di DB → pakai default gates
  return { id: planId, name: planId, featureGates: defaultGates() };
}

/** Alias scope-tenant (kompatibilitas mundur; mode default billingAttachedTo="tenant"). */
export async function getTenantPlan(tenantId: string): Promise<TenantPlan> {
  return getBillingPlan({ type: "tenant", id: tenantId });
}

/** Alias scope-user (dipakai saat billingAttachedTo="user"). */
export async function getUserPlan(userId: string): Promise<TenantPlan> {
  return getBillingPlan({ type: "user", id: userId });
}

/**
 * Resolve plan aktif SESUAI billingAttachedTo — dipakai di server page/enforcer:
 * - "tenant" (default) → getTenantPlan(tenantId).
 * - "user" → ambil user aktif (getUser) lalu getUserPlan(userId) (satu langganan lintas tenant).
 * Default mode tidak memanggil getUser (zero overhead).
 */
export async function getActivePlan(tenantId: string): Promise<TenantPlan> {
  if (billingConfig.billingAttachedTo === "user") {
    const user = await getUser();
    if (user?.id) return getUserPlan(user.id);
  }
  return getTenantPlan(tenantId);
}

/**
 * Memvalidasi apakah tenant memiliki akses ke suatu fitur boolean (mis. 'allowPdfFormat')
 */
export async function hasFeature(
  tenantId: string,
  featureKey: keyof Omit<FeatureGates, "maxUsers" | "maxTasks">
): Promise<boolean> {
  const plan = await getActivePlan(tenantId);
  return plan.featureGates[featureKey] === true;
}

/**
 * Mengambil batas kuota angka dari suatu fitur (mis. 'maxTasks', 'maxUsers')
 */
export async function getFeatureLimit(
  tenantId: string,
  limitKey: "maxUsers" | "maxTasks"
): Promise<number> {
  const plan = await getActivePlan(tenantId);
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
