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

const CACHE_TTL_MS = 5 * 60 * 1000;
const featureGatesCache = new Map<string, { name: string; gates: FeatureGates; ts: number }>();

function defaultGates(): FeatureGates {
  return decodeFeatureGates(null);
}

function deniedGates(): FeatureGates {
  const gates = {} as Record<string, boolean | number>;
  FEATURE_DEFINITIONS.forEach((f) => {
    gates[f.key] = f.type === "boolean" ? false : 0;
  });
  return gates as unknown as FeatureGates;
}

async function fetchPlanFeatureGates(
  planId: string
): Promise<{ name: string; gates: FeatureGates } | null> {
  const now = Date.now();
  const cached = featureGatesCache.get(planId);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return { name: cached.name, gates: cached.gates };
  }

  const { data: plan } = await (
    await planRepository(supabaseAdmin)
  )
    .query()
    .select("name, features, is_active")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) return null;

  const result = { name: plan.name || planId, gates: decodeFeatureGates(plan.features) };
  featureGatesCache.set(planId, { ...result, ts: now });
  return result;
}

export async function getBillingPlan(owner: BillingOwner): Promise<TenantPlan> {
  const { column, value } = ownerFilter(owner);
  const { data: subscription } = await (
    await subscriptionRepository(supabaseAdmin)
  )
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

  return { id: planId, name: planId, featureGates: defaultGates() };
}

export async function getTenantPlan(tenantId: string): Promise<TenantPlan> {
  return getBillingPlan({ type: "tenant", id: tenantId });
}

export async function getUserPlan(userId: string): Promise<TenantPlan> {
  return getBillingPlan({ type: "user", id: userId });
}

export async function getActivePlan(tenantId: string): Promise<TenantPlan> {
  if (billingConfig.billingAttachedTo === "user") {
    const user = await getUser();
    if (user?.id) return getUserPlan(user.id);
  }
  return getTenantPlan(tenantId);
}

export async function hasFeature(
  tenantId: string,
  featureKey: keyof Omit<FeatureGates, "maxUsers" | "maxTasks">
): Promise<boolean> {
  const plan = await getActivePlan(tenantId);
  return plan.featureGates[featureKey] === true;
}

export async function getFeatureLimit(
  tenantId: string,
  limitKey: "maxUsers" | "maxTasks"
): Promise<number> {
  const plan = await getActivePlan(tenantId);
  return plan.featureGates[limitKey] ?? 0;
}

export function invalidatePlanCache(planId?: string): void {
  if (planId) featureGatesCache.delete(planId);
  else featureGatesCache.clear();
}

export const NUMERIC_FEATURE_KEYS = FEATURE_DEFINITIONS.filter((f) => f.type === "number").map(
  (f) => f.key
) as (keyof FeatureGates)[];
