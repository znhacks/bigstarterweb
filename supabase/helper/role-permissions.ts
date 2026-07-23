// supabase/helper/role-permissions.ts
//
// Helper pengambilan data tabel `role_permissions` (schema public).
// Tabel jembatan role ↔ permission (many-to-many).

import { getClient, type AnySupabaseClient } from "./client";
import { rolePermissionRepository } from "@/supabase/repositories/role-permissions";

/** Ambil seluruh pasangan role-permission untuk sebuah role. */
export async function getRolePermissionsByRole(
  roleId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await rolePermissionRepository(supabase);
  return repo.query().select(select as "*").eq("role_id", roleId);
}

/** Ambil daftar seluruh role_permissions. */
export async function listRolePermissions(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await rolePermissionRepository(supabase);
  return repo.query().select(select as "*");
}
