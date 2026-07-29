"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { planRepository } from "@/supabase/repositories/plans";
import { planPriceRepository } from "@/supabase/repositories/plan-pices";
import { SuperadminOrganization } from "./logic";

export async function getSuperadminOrganizations(): Promise<SuperadminOrganization[]> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        }
      }
    }
  );

  const { data: tenants, error } = await (
    await tenantRepository(supabaseAdmin)
  )
    .query()
    .select(
      `
      id,
      name,
      created_at,
      memberships (
        id
      ),
      subscriptions (
        status,
        ends_at,
        plan_id
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load organizations:", error.message);
    return [];
  }

  const [{ data: dbPlans }, { data: dbPrices }] = await Promise.all([
    (await planRepository(supabaseAdmin)).query().select("id, name"),
    (await planPriceRepository(supabaseAdmin)).query().select("plan_id, interval, amount")
  ]);

  const planInfoMap = new Map<string, { name: string; monthly: number }>();
  (dbPlans ?? []).forEach((p: any) => planInfoMap.set(p.id, { name: p.name, monthly: 0 }));
  (dbPrices ?? []).forEach((pr: any) => {
    const entry = planInfoMap.get(pr.plan_id);
    if (entry && pr.interval === "monthly") entry.monthly = parseFloat(pr.amount);
  });

  const formattedOrgs: SuperadminOrganization[] = (tenants || []).map((tenant: any) => {
    const firstSub = tenant.subscriptions?.[0];
    const planInfo = planInfoMap.get(firstSub?.plan_id);

    return {
      id: tenant.id,
      name: tenant.name || "Unnamed Organization",
      logo: tenant.logo_url || null,
      created_at: tenant.created_at,
      memberCount: tenant.memberships ? tenant.memberships.length : 0,
      planName: planInfo?.name ?? firstSub?.plan_id ?? "Free",
      planStatus: firstSub?.status || "inactive",
      endsAt: firstSub?.ends_at || null,
      price: planInfo?.monthly ?? 0
    };
  });

  return formattedOrgs;
}
