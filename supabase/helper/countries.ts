// supabase/helper/countries.ts
//
// Helper pengambilan data tabel `countries` (schema public).
// Dipakai bersama states/cities/kecamatan/desa untuk form alamat bertingkat.

import { getClient, type AnySupabaseClient } from "./client";
import { countryRepository } from "@/supabase/repositories/countries";

/** Ambil satu negara berdasarkan id. */
export async function getCountryById(
  id: number,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await countryRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil satu negara berdasarkan kode ISO alpha-2 (mis. "ID", "US"). */
export async function getCountryByIso2(
  iso2: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await countryRepository(supabase);
  return repo.query().select(select as "*").eq("iso2", iso2).maybeSingle();
}

/** Ambil daftar seluruh negara. */
export async function listCountries(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await countryRepository(supabase);
  return repo.query().select(select as "*");
}
