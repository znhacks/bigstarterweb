import { getTenantId } from "../context";
import { protectedProcedure } from "../procedures";
import { supabaseAdmin } from "../supabase-server";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { subscriptionSchema } from "../schemas";
import { dbError } from "../errors";

export const getSubscription = protectedProcedure
  .route({
    method: "GET",
    path: "/subscription",
    tags: ["Billing"],
    summary: "Get the current subscription",
    description: "Active subscription + plan details for the current organization. Returns a free-tier shape when none is active."
  })
  .output(subscriptionSchema)
  .handler(async ({ context }) => {
    const tenantId = getTenantId(context);
    const subscriptionRepo = await subscriptionRepository(supabaseAdmin);
    const { data, error } = await subscriptionRepo
      .query()
      .select("tenant_id, status, starts_at, ends_at, cancel_at_period_end, plans(name)")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw dbError(error);

    // PostgREST returns the related plan as an array; take the single element.
    const rawPlan: any = Array.isArray(data?.plans) ? data?.plans[0] : data?.plans;

    return {
      tenant_id: tenantId,
      status: data?.status ?? "inactive",
      starts_at: data?.starts_at ?? null,
      ends_at: data?.ends_at ?? null,
      cancel_at_period_end: data?.cancel_at_period_end ?? null,
      plan: rawPlan ?? null
    };
  });

export const subscriptionsRouter = { get: getSubscription };
