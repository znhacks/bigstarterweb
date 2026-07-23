import * as z from "zod";
import { o } from "../context";
import { supabaseAdmin } from "../supabase-server";
import { planRepository } from "@/supabase/repositories/plans";
import { planSchema } from "../schemas";
import { notFound, dbError } from "../errors";

/** Public — no authentication required. */
export const listPlans = o
  .route({
    method: "GET",
    path: "/plans",
    tags: ["Plans"],
    summary: "List plans",
    description: "Returns every subscription plan. Pricing lives in plan_prices; feature limits encoded in features[]."
  })
  .output(z.array(planSchema))
  .handler(async () => {
    const planRepo = await planRepository(supabaseAdmin);
    const { data, error } = await planRepo
      .query()
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw dbError(error);
    return data ?? [];
  });

/** Public — no authentication required. */
export const getPlan = o
  .route({
    method: "GET",
    path: "/plans/{id}",
    tags: ["Plans"],
    summary: "Get a plan"
  })
  .input(z.object({ id: z.string() }))
  .output(planSchema)
  .handler(async ({ input }) => {
    const planRepo = await planRepository(supabaseAdmin);
    const { data, error } = await planRepo
      .query()
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound("Plan not found.");
    return data;
  });

export const plansRouter = { list: listPlans, get: getPlan };
