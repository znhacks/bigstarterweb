// lib/billing/tenant-auth.ts
//
// Mencegah IDOR pada route billing user: memastikan user yg terautentikasi
// benar-benar anggota tenant yg dimanipulasi (checkout/cancel/resume/downgrade).

import type { SupabaseClient } from "@supabase/supabase-js";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { profileRepository } from "@/supabase/repositories/profiles";
import { ALL_PERMISSIONS } from "@/modules/rbac/shared/permissions";

/**
 * Cek apakah userId adalah anggota tenantId (tabel memberships).
 * Superadmin sistem (is_superadmin) diizinkan bypass bila perlu.
 */
export async function isTenantMember(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<boolean> {
  if (!userId || !tenantId) return false;

  const membershipRepo = await membershipRepository(supabase);
  const { data: membership } = await membershipRepo
    .query()
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (membership) return true;

  // Fallback: superadmin sistem boleh akses tenant manapun
  const profileRepo = await profileRepository(supabase);
  const { data: profile } = await profileRepo
    .query()
    .select("is_superadmin")
    .eq("id", userId)
    .maybeSingle();

  return profile?.is_superadmin === true;
}

/**
 * Resolve otoritas user (role + nama permission) di sebuah tenant.
 *
 * Mengapa manual: function RLS `is_tenant_admin()` / `has_permission()` memakai
 * `auth.uid()`, yang bernilai NULL pada client service-role. Route billing
 * memakai service-role, jadi otoritas HARUS di-resolve di sisi aplikasi lewat
 * join memberships → roles → role_permissions → permissions (filter user_id).
 */
async function resolveTenantAuthority(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<{ permissions: string[] } | null> {
  const membershipRepo = await membershipRepository(supabase);
  const { data } = await membershipRepo
    .query()
    .select("role_id, roles ( role_permissions ( permissions ( name ) ) )")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!data) return null;
  const role = (data as any).roles;
  if (!role) return { permissions: [] };
  const perms = ((role.role_permissions as any[]) ?? [])
    .map((rp: any) => rp?.permissions?.name)
    .filter((n: any): n is string => typeof n === "string");
  return { permissions: perms };
}

/**
 * Resolve daftar permission efektif untuk (userId, tenantId). Superadmin sistem
 * (profiles.is_superadmin) → semua permission; selain itu → permission dari
 * membership tenant tsb. Dipakai lapisan API (oRPC requirePermission).
 */
export async function resolveTenantPermissions(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<string[]> {
  if (!userId || !tenantId) return [];
  if (await isSystemSuperadmin(supabase, userId)) {
    return ALL_PERMISSIONS as unknown as string[];
  }
  const authority = await resolveTenantAuthority(supabase, userId, tenantId);
  return authority?.permissions ?? [];
}

/**
 * Resolve otoritas lengkap (permissions + flag superadmin) untuk
 * (userId, tenantId). Superadmin → semua permission.
 */
export async function resolveTenantAuthorityFull(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<{
  permissions: string[];
  isSuperadmin: boolean;
}> {
  const isSuperadmin = await isSystemSuperadmin(supabase, userId);
  if (isSuperadmin) {
    return {
      permissions: ALL_PERMISSIONS as unknown as string[],
      isSuperadmin: true
    };
  }
  const authority = await resolveTenantAuthority(supabase, userId, tenantId);
  return {
    permissions: authority?.permissions ?? [],
    isSuperadmin: false
  };
}

async function isSystemSuperadmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const profileRepo = await profileRepository(supabase);
  const { data: profile } = await profileRepo
    .query()
    .select("is_superadmin")
    .eq("id", userId)
    .maybeSingle();
  return profile?.is_superadmin === true;
}

/**
 * Apakah user adalah admin tenant yang dapat mengundang/kelola member.
 */
export async function isTenantAdmin(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<boolean> {
  if (!userId || !tenantId) return false;
  if (await isSystemSuperadmin(supabase, userId)) return true;
  const authority = await resolveTenantAuthority(supabase, userId, tenantId);
  if (!authority) return false;
  return (
    authority.permissions.includes("members.invite") ||
    authority.permissions.includes("members.manage") ||
    authority.permissions.includes("members.remove")
  );
}

/**
 * Apakah user boleh mengelola billing tenant (cancel/downgrade/resume/trial).
 * True bila: superadmin sistem, ATAU punya permission `billing.manage`.
 */
export async function canManageBilling(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<boolean> {
  if (!userId || !tenantId) return false;
  if (await isSystemSuperadmin(supabase, userId)) return true;
  const authority = await resolveTenantAuthority(supabase, userId, tenantId);
  if (!authority) return false;
  return authority.permissions.includes("billing.manage");
}
