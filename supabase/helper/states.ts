// supabase/helper/states.ts
//
// Helper pengambilan data tabel `states` (schema public).
// Provinsi / negara bagian — turunan dari countries.

import { getClient, type AnySupabaseClient } from "./client";
import { stateRepository } from "@/supabase/repositories/states";

/** Ambil satu state berdasarkan id. */
export async function getStateById(
  id: number,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await stateRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil daftar state/provinsi pada sebuah negara. */
export async function getStatesByCountry(
  countryId: number,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await stateRepository(supabase);
  return repo.query().select(select as "*").eq("country_id", countryId);
}
