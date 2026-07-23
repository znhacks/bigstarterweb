// supabase/helper/roles.ts
//
// Helper pengambilan data tabel `roles` (schema public).

import { getClient, type AnySupabaseClient } from "./client";
import { roleRepository } from "@/supabase/repositories/roles";

/** Ambil satu role berdasarkan id. */
export async function getRole(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await roleRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil satu role berdasarkan nama (dipakai saat sync RBAC). */
export async function getRoleByName(
  name: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await roleRepository(supabase);
  return repo.query().select(select as "*").eq("name", name).maybeSingle();
}

/** Ambil daftar seluruh role. */
export async function listRoles(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await roleRepository(supabase);
  return repo.query().select(select as "*");
}
