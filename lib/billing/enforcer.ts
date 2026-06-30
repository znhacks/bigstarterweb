// lib/billing/enforcer.ts
import { createClient } from "@supabase/supabase-js";
import { plans } from "@/config/billing";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LimitCheckResult {
  allowed: boolean;
  current: number;
  max: number;
  planName: string;
}

export async function checkSeatLimit(tenantId: string): Promise<LimitCheckResult> {
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_id, status, ends_at")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const isExpired = sub?.ends_at ? new Date() > new Date(sub.ends_at) : false;
  const activePlanId = sub && sub.status === "active" && !isExpired ? sub.plan_id : "free";
  const planConfig = plans.find((p) => p.id === activePlanId)!;

  const { count, error } = await supabaseAdmin
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (error) throw error;

  const currentSeats = count || 0;
  const maxSeats = planConfig.maxUsers;

  return {
    allowed: currentSeats < maxSeats,
    current: currentSeats,
    max: maxSeats,
    planName: planConfig.name
  };
}

export async function checkUsageLimit(tenantId: string): Promise<LimitCheckResult> {
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_id, status, ends_at")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const isExpired = sub?.ends_at ? new Date() > new Date(sub.ends_at) : false;
  const activePlanId = sub && sub.status === "active" && !isExpired ? sub.plan_id : "free";
  const planConfig = plans.find((p) => p.id === activePlanId)!;

  // B. Hitung penggunaan screenshot di bulan kalender berjalan saat ini
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // Catatan: Ganti 'screenshot_logs' dengan tabel pencatatan aktivitas fitur Anda
  const { count, error } = await supabaseAdmin
    .from("screenshot_logs")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", startOfMonth);

  if (error) throw error;

  const currentUsage = count || 0;
  const maxUsage = planConfig.maxScreenshots;

  return {
    allowed: currentUsage < maxUsage,
    current: currentUsage,
    max: maxUsage,
    planName: planConfig.name
  };
}
