import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decodeFeatureGates } from "@/config/feature-definitions";
import { planRepository } from "@/supabase/repositories/plans";
import { planPriceRepository } from "@/supabase/repositories/plan-pices";
import { getActiveVirtualPlans } from "@/config/virtual-plans";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET() {
  try {
    const { data: dbPlans, error: plansError } = await (
      await planRepository(supabaseAdmin)
    )
      .query()
      .select("*")
      .eq("is_active", true);

    if (plansError) throw plansError;

    const { data: dbPrices, error: pricesError } = await (
      await planPriceRepository(supabaseAdmin)
    )
      .query()
      .select("*");

    if (pricesError) throw pricesError;

    const formattedPlans = dbPlans.map((plan: any) => {
      const monthlyPrice = dbPrices.find(
        (p: any) => p.plan_id === plan.id && p.interval === "monthly"
      );
      const yearlyPrice = dbPrices.find(
        (p: any) => p.plan_id === plan.id && p.interval === "yearly"
      );

      const compiledFeatureGates = decodeFeatureGates(plan.features);

      return {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        displayFeatures: plan.display_features || [],
        features: plan.display_features || [],
        featureGates: compiledFeatureGates,
        isEnterprise: !!plan.is_enterprise,
        isRecommended: !!plan.is_recommended,
        trialDays: plan.trial_days || 0,
        sort_order: plan.sort_order !== undefined ? plan.sort_order : null,
        weight: plan.weight !== undefined ? plan.weight : null,
        prices: {
          monthly: {
            amount: monthlyPrice ? parseFloat(monthlyPrice.amount) : 0,
            currency: monthlyPrice?.currency || "IDR",
            convertedAmount: monthlyPrice ? parseFloat(monthlyPrice.amount) : 0,
            productId: (monthlyPrice as any)?.product_id || null,
            providers: monthlyPrice ? monthlyPrice.provider_ids : {}
          },
          yearly: {
            amount: yearlyPrice ? parseFloat(yearlyPrice.amount) : 0,
            currency: yearlyPrice?.currency || "IDR",
            convertedAmount: yearlyPrice ? parseFloat(yearlyPrice.amount) : 0,
            productId: (yearlyPrice as any)?.product_id || null,
            providers: yearlyPrice ? yearlyPrice.provider_ids : {}
          }
        }
      };
    });

    // Merge virtual plans (free/enterprise via config) — skip bila id sudah ada di DB.
    const dbPlanIds = new Set(formattedPlans.map((p: any) => p.id));
    const virtualPlans = getActiveVirtualPlans().filter((p) => !dbPlanIds.has(p.id));

    return NextResponse.json({ success: true, plans: [...formattedPlans, ...virtualPlans] });
  } catch (error: any) {
    console.error("Failed to fetch dynamic plans:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
