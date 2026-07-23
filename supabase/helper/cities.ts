// supabase/helper/cities.ts
//
// Helper pengambilan data tabel `cities` (schema public).
// Kota / kabupaten — turunan dari states.

import { getClient, type AnySupabaseClient } from "./client";
import { cityRepository } from "@/supabase/repositories/cities";

/** Ambil satu city berdasarkan id. */
export async function getCityById(
  id: number,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await cityRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil daftar kota/kabupaten pada sebuah state. */
export async function getCitiesByState(
  stateId: number,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await cityRepository(supabase);
  return repo.query().select(select as "*").eq("state_id", stateId);
}
