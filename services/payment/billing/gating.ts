// services/billing/gating.ts

import { createClient } from "@supabase/supabase-js";
import { plans, FeatureGates } from "@/config/billing";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * Mengambil paket langganan aktif milik tenant dari database Supabase
 */
export async function getTenantPlan(tenantId: string) {
  const { data: subscription, error } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_id, status")
    .eq("tenant_id", tenantId)
    .single();

  if (error || !subscription || subscription.status !== "active") {
    // Jika tidak ada langganan aktif, kembalikan ke paket default 'free'
    return plans.find((p) => p.id === "free") || null;
  }

  return plans.find((p) => p.id === subscription.plan_id) || null;
}

/**
 * Memvalidasi apakah tenant memiliki akses ke suatu fitur boolean (misal: 'allowPdfFormat')
 */
export async function hasFeature(
  tenantId: string,
  featureKey: keyof Omit<FeatureGates, "maxUsers" | "maxTasks">
): Promise<boolean> {
  const plan = await getTenantPlan(tenantId);
  if (!plan) return false;

  return plan.featureGates[featureKey] === true;
}

/**
 * Mengambil batas kuota angka dari suatu fitur (misal: 'maxTasks')
 */
export async function getFeatureLimit(
  tenantId: string,
  limitKey: "maxUsers" | "maxTasks"
): Promise<number> {
  const plan = await getTenantPlan(tenantId);
  if (!plan) return 0;

  return plan.featureGates[limitKey];
}
