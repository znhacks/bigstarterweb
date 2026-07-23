// supabase/helper/plans.ts
//
// Helper pengambilan data tabel `plans` (schema public).
// Plan menyimpan features sebagai text[]; decode dilakukan di luar helper.

import { getClient, type AnySupabaseClient } from "./client";
import { planRepository } from "@/supabase/repositories/plans";

/** Ambil satu plan berdasarkan id. */
export async function getPlan(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await planRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil satu plan berdasarkan id, mengembalikan null bila tidak ada. */
export async function getPlanMaybe(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await planRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).maybeSingle();
}

/** Ambil daftar seluruh plan. */
export async function listPlans(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await planRepository(supabase);
  return repo.query().select(select as "*");
}
