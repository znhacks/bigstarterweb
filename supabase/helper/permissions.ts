// supabase/helper/permissions.ts
//
// Helper pengambilan data tabel `permissions` (schema public).

import { getClient, type AnySupabaseClient } from "./client";
import { permissionRepository } from "@/supabase/repositories/permissions";

/** Ambil satu permission berdasarkan id. */
export async function getPermission(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await permissionRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil satu permission berdasarkan nama (dipakai saat sync RBAC). */
export async function getPermissionByName(
  name: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await permissionRepository(supabase);
  return repo
    .query()
    .select(select as "*")
    .eq("name", name)
    .maybeSingle();
}

/** Ambil daftar seluruh permission. */
export async function listPermissions(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await permissionRepository(supabase);
  return repo.query().select(select as "*");
}
