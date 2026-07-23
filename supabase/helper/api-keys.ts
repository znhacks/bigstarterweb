// supabase/helper/api-keys.ts
//
// Helper pengambilan data tabel `api_keys` (schema public).
// Umumnya diakses dengan service-role client (supabaseAdmin) karena di luar RLS
// sesi browser — lewatkan `client` = supabaseAdmin.

import { getClient, type AnySupabaseClient } from "./client";
import { apiKeyRepository } from "@/supabase/repositories/api-keys";

/** Ambil satu api key berdasarkan id. */
export async function getApiKey(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await apiKeyRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Validasi api key berdasarkan hash-nya (hanya yang belum di-revoke). */
export async function getApiKeyByHash(
  keyHash: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await apiKeyRepository(supabase);
  return repo
    .query()
    .select(select as "*")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();
}

/** Ambil daftar seluruh api key. */
export async function listApiKeys(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await apiKeyRepository(supabase);
  return repo.query().select(select as "*");
}
