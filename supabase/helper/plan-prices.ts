// supabase/helper/plan-prices.ts
//
// Helper pengambilan data tabel `plan_prices` (schema public).
// Satu plan bisa memiliki beberapa price (mis. interval monthly/yearly).

import { getClient, type AnySupabaseClient } from "./client";
import { planPriceRepository } from "@/supabase/repositories/plan-pices";

/** Ambil seluruh price untuk sebuah plan. */
export async function getPlanPricesByPlan(
  planId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await planPriceRepository(supabase);
  return repo.query().select(select as "*").eq("plan_id", planId);
}

/** Ambil daftar seluruh plan_prices. */
export async function listPlanPrices(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await planPriceRepository(supabase);
  return repo.query().select(select as "*");
}
