// supabase/helper/profiles.ts
//
// Helper pengambilan data tabel `profiles` (schema public).
// Kolom `select` dibuat fleksibel & default "*" — biarkan pengguna memilih.

import { getClient, type AnySupabaseClient } from "./client";
import { profileRepository } from "@/supabase/repositories/profiles";

/** Ambil satu profile berdasarkan id user. */
export async function getProfile(
  userId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await profileRepository(supabase);
  return repo.query().select(select as "*").eq("id", userId).single();
}

/** Ambil satu profile berdasarkan email. */
export async function getProfileByEmail(
  email: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await profileRepository(supabase);
  return repo
    .query()
    .select(select as "*")
    .eq("email", email)
    .maybeSingle();
}

/** Ambil beberapa profile sekaligus berdasarkan daftar id. */
export async function getProfilesByIds(
  ids: string[],
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await profileRepository(supabase);
  return repo.query().select(select as "*").in("id", ids);
}

/** Ambil daftar seluruh profile. */
export async function listProfiles(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await profileRepository(supabase);
  return repo.query().select(select as "*");
}
