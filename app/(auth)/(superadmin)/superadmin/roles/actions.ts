// app/(auth)/(superadmin)/superadmin/roles/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/api/supabase-server";

// Mendefinisikan tipe kembalian aksi yang mendukung opsional roleId
type ActionResult =
  { success: true; roleId?: string; error?: never } | { success: false; error: string };

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export async function createRole(formData: FormData): Promise<ActionResult> {
  await requireSuperadmin();
  const name = String(formData.get("name") || "").trim();
  const hierarchy = Number(formData.get("hierarchy_level") ?? 0);

  if (!name) return { success: false, error: "Nama role wajib diisi." };

  // SOLUSI: Menambahkan .select("id").single() untuk mendapatkan ID peran baru
  const { data, error } = await supabaseAdmin
    .from("roles")
    .insert({ name, hierarchy_level: Number.isFinite(hierarchy) ? hierarchy : 0 })
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
  const hierarchy = Number(formData.get("hierarchy_level") ?? 0);

  if (!id || !name) return { success: false, error: "Data role tidak lengkap." };

  const { error } = await supabaseAdmin
    .from("roles")
    .update({ name, hierarchy_level: Number.isFinite(hierarchy) ? hierarchy : 0 })
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

  // Tolak hapus jika masih ada membership/invitation yang memakai role ini.
  const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
    supabaseAdmin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("role_id", id),
    supabaseAdmin.from("invitations").select("id", { count: "exact", head: true }).eq("role_id", id)
  ]);

  const used = (memberCount ?? 0) + (inviteCount ?? 0);
  if (used > 0) {
    return {
      success: false,
      error: `Role tidak bisa dihapus: masih dipakai oleh ${used} membership/undangan.`
    };
  }

  // role_permissions otomatis ter-cascade on delete.
  const { error } = await supabaseAdmin.from("roles").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/superadmin/roles");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Permission grants (role_permissions)                                */
/* ------------------------------------------------------------------ */

/**
 * Ganti seluruh grant permission untuk sebuah role: hapus semua, lalu
 * insert set terpilih. Dijalankan dalam satu transaksi logika.
 */
export async function setRolePermissions(
  roleId: string,
  permissionIds: string[]
): Promise<ActionResult> {
  await requireSuperadmin();
  if (!roleId) return { success: false, error: "ID role hilang." };

  const { error: delError } = await supabaseAdmin
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId);
  if (delError) return { success: false, error: delError.message };

  if (permissionIds.length > 0) {
    const rows = permissionIds.map((permission_id) => ({ role_id: roleId, permission_id }));
    const { error: insError } = await supabaseAdmin.from("role_permissions").insert(rows);
    if (insError) return { success: false, error: insError.message };
  }

  revalidatePath(`/superadmin/roles/${roleId}`);
  revalidatePath("/superadmin/roles");
  return { success: true };
}

// SOLUSI: Mengimplementasikan getRolePermissions yang hilang
export async function getRolePermissions(
  roleId: string
): Promise<{ success: true; grantedIds: string[] } | { success: false; error: string }> {
  await requireSuperadmin();
  if (!roleId) return { success: false, error: "ID role hilang." };

  const { data, error } = await supabaseAdmin
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", roleId);

  if (error) return { success: false, error: error.message };

  const grantedIds = data?.map((row) => row.permission_id) || [];
  return { success: true, grantedIds };
}

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

export async function createPermission(formData: FormData): Promise<ActionResult> {
  await requireSuperadmin();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;

  if (!name) return { success: false, error: "Nama permission wajib diisi." };

  const { error } = await supabaseAdmin.from("permissions").insert({ name, description });
  if (error) return { success: false, error: error.message };
  revalidatePath("/superadmin/roles");
  return { success: true };
}

export async function deletePermission(formData: FormData): Promise<ActionResult> {
  await requireSuperadmin();
  const id = String(formData.get("id") || "");
  if (!id) return { success: false, error: "ID permission hilang." };

  // role_permissions ter-cascade on delete, jadi grant ikut terhapus.
  const { error } = await supabaseAdmin.from("permissions").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/superadmin/roles");
  return { success: true };
}
