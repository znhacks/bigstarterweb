// app/api/billing/plans/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decodeFeatureGates } from "@/config/feature-definitions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET() {
  try {
    // 1. Tarik semua paket aktif dari database
    const { data: dbPlans, error: plansError } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("is_active", true);

    if (plansError) throw plansError;

    // 2. Tarik seluruh daftar harga aktif dari database
    const { data: dbPrices, error: pricesError } = await supabaseAdmin
      .from("plan_prices")
      .select("*");

    if (pricesError) throw pricesError;

    // 3. Rekonstruksi struktur data agar kompatibel 100% dengan UI Frontend (ConvertedPlan)
    const formattedPlans = dbPlans.map((plan: any) => {
      const monthlyPrice = dbPrices.find(
        (p: any) => p.plan_id === plan.id && p.interval === "monthly"
      );
      const yearlyPrice = dbPrices.find(
        (p: any) => p.plan_id === plan.id && p.interval === "yearly"
      );

      // Dekompilasi array ['limit:maxTasks:2000'] menjadi objek terstruktur FeatureGates untuk dibaca sistem
      const compiledFeatureGates = decodeFeatureGates(plan.features);

      return {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        displayFeatures: plan.display_features || [],
        features: plan.display_features || [], // Backwards compatibility untuk UI
        featureGates: compiledFeatureGates,
        prices: {
          monthly: {
            amount: monthlyPrice ? parseFloat(monthlyPrice.amount) : 0,
            convertedAmount: monthlyPrice ? parseFloat(monthlyPrice.amount) : 0,
            providers: monthlyPrice ? monthlyPrice.provider_ids : {}
          },
          yearly: {
            amount: yearlyPrice ? parseFloat(yearlyPrice.amount) : 0,
            convertedAmount: yearlyPrice ? parseFloat(yearlyPrice.amount) : 0,
            providers: yearlyPrice ? yearlyPrice.provider_ids : {}
          }
        }
      };
    });

    return NextResponse.json({ success: true, plans: formattedPlans });
  } catch (error: any) {
    console.error("Failed to fetch dynamic plans:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
