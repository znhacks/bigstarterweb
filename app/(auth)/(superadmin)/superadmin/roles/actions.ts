"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { roleRepository } from "@/supabase/repositories/roles";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { invitationRepository } from "@/supabase/repositories/invitations";
import { rolePermissionRepository } from "@/supabase/repositories/role-permissions";
import { permissionRepository } from "@/supabase/repositories/permissions";
import { Permission, RoleRow } from "./logic";

type ActionResult =
  { success: true; roleId?: string; error?: never } | { success: false; error: string };

export async function createRole(formData: FormData): Promise<ActionResult> {
  await requireSuperadmin();
  const name = String(formData.get("name") || "").trim();

  if (!name) return { success: false, error: "Nama role wajib diisi." };

  const { data, error } = await (
    await roleRepository(supabaseAdmin)
  )
    .query()
    .insert({ name })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/superadmin/roles");
  return { success: true, roleId: data.id };
}

export async function updateRole(formData: FormData): Promise<ActionResult> {
  await requireSuperadmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();

  if (!id || !name) return { success: false, error: "Data role tidak lengkap." };

  const { error } = await (
    await roleRepository(supabaseAdmin)
  )
    .query()
    .update({ name })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/superadmin/roles");
  revalidatePath(`/superadmin/roles/${id}`);
  return { success: true };
}

export async function deleteRole(formData: FormData): Promise<ActionResult> {
  await requireSuperadmin();
  const id = String(formData.get("id") || "");
  if (!id) return { success: false, error: "ID role hilang." };

  const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
    (await membershipRepository(supabaseAdmin))
      .query()
      .select("id", { count: "exact", head: true })
      .eq("role_id", id),
    (await invitationRepository(supabaseAdmin))
      .query()
      .select("id", { count: "exact", head: true })
      .eq("role_id", id)
  ]);

  const used = (memberCount ?? 0) + (inviteCount ?? 0);
  if (used > 0) {
    return {
      success: false,
      error: `Role tidak bisa dihapus: masih dipakai oleh ${used} membership/undangan.`
    };
  }

  const { error } = await (await roleRepository(supabaseAdmin)).query().delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/superadmin/roles");
  return { success: true };
}

export async function setRolePermissions(
  roleId: string,
  permissionIds: string[]
): Promise<ActionResult> {
  await requireSuperadmin();
  if (!roleId) return { success: false, error: "ID role hilang." };

  const rolePermissionsRepo = await rolePermissionRepository(supabaseAdmin);

  const { error: delError } = await rolePermissionsRepo.query().delete().eq("role_id", roleId);
  if (delError) return { success: false, error: delError.message };

  if (permissionIds.length > 0) {
    const rows = permissionIds.map((permission_id) => ({ role_id: roleId, permission_id }));
    const { error: insError } = await rolePermissionsRepo.query().insert(rows);
    if (insError) return { success: false, error: insError.message };
  }

  revalidatePath(`/superadmin/roles/${roleId}`);
  revalidatePath("/superadmin/roles");
  return { success: true };
}

export async function getRolePermissions(
  roleId: string
): Promise<{ success: true; grantedIds: string[] } | { success: false; error: string }> {
  await requireSuperadmin();
  if (!roleId) return { success: false, error: "ID role hilang." };

  const { data, error } = await (
    await rolePermissionRepository(supabaseAdmin)
  )
    .query()
    .select("permission_id")
    .eq("role_id", roleId);

  if (error) return { success: false, error: error.message };

  const grantedIds = data?.map((row) => row.permission_id) || [];
  return { success: true, grantedIds };
}

export async function createPermission(formData: FormData): Promise<ActionResult> {
  await requireSuperadmin();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;

  if (!name) return { success: false, error: "Nama permission wajib diisi." };

  const { error } = await (
    await permissionRepository(supabaseAdmin)
  )
    .query()
    .insert({ name, description });
  if (error) return { success: false, error: error.message };
  revalidatePath("/superadmin/roles");
  return { success: true };
}

export async function deletePermission(formData: FormData): Promise<ActionResult> {
  await requireSuperadmin();
  const id = String(formData.get("id") || "");
  if (!id) return { success: false, error: "ID permission hilang." };

  const { error } = await (await permissionRepository(supabaseAdmin)).query().delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/superadmin/roles");
  return { success: true };
}

export async function getSuperadminRoles(): Promise<{
  rows: RoleRow[];
  permissions: Permission[];
}> {
  await requireSuperadmin();

  const [{ data: roles }, { data: memberRows }, { data: permRows }, { data: permissions }] =
    await Promise.all([
      (await roleRepository(supabaseAdmin))
        .query()
        .select("id, name, created_at")
        .order("created_at", { ascending: false }),
      (await membershipRepository(supabaseAdmin)).query().select("role_id"),
      (await rolePermissionRepository(supabaseAdmin)).query().select("role_id"),
      (await permissionRepository(supabaseAdmin))
        .query()
        .select("id, name, description")
        .order("name", { ascending: true })
    ]);

  const memberCount = new Map<string, number>();
  (memberRows ?? []).forEach((m: any) => {
    if (m.role_id) {
      memberCount.set(m.role_id, (memberCount.get(m.role_id) ?? 0) + 1);
    }
  });

  const permCount = new Map<string, number>();
  (permRows ?? []).forEach((p: any) => {
    permCount.set(p.role_id, (permCount.get(p.role_id) ?? 0) + 1);
  });

  const rows: RoleRow[] = (roles ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    members_count: memberCount.get(r.id) ?? 0,
    permissions_count: permCount.get(r.id) ?? 0
  }));

  return {
    rows,
    permissions: (permissions ?? []) as Permission[]
  };
}
