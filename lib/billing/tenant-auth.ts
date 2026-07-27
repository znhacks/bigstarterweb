// lib/billing/tenant-auth.ts
//
// Mencegah IDOR pada route billing user: memastikan user yg terautentikasi
// benar-benar anggota tenant yg dimanipulasi (checkout/cancel/resume/downgrade).

import type { SupabaseClient } from "@supabase/supabase-js";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { profileRepository } from "@/supabase/repositories/profiles";
import { ALL_PERMISSIONS } from "@/lib/rbac/permissions";

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
 * Resolve otoritas user (hierarchy_level + nama permission) di sebuah tenant.
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
): Promise<{ hierarchyLevel: number | null; permissions: string[] } | null> {
  const membershipRepo = await membershipRepository(supabase);
  const { data } = await membershipRepo
    .query()
    .select("role_id, roles ( hierarchy_level, role_permissions ( permissions ( name ) ) )")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!data) return null;
  const role = (data as any).roles;
  if (!role) return { hierarchyLevel: null, permissions: [] };
  const perms = ((role.role_permissions as any[]) ?? [])
    .map((rp: any) => rp?.permissions?.name)
    .filter((n: any): n is string => typeof n === "string");
  return { hierarchyLevel: role.hierarchy_level ?? null, permissions: perms };
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
 * Resolve otoritas lengkap (hierarchy + permissions + flag superadmin) untuk
 * (userId, tenantId). Superadmin → hierarchy tinggi (canAssignRole selalu true) +
 * semua permission. Dipakai server action org/member utk cek permission + hierarchy.
 */
export async function resolveTenantAuthorityFull(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<{
  hierarchyLevel: number | null;
  permissions: string[];
  isSuperadmin: boolean;
}> {
  const isSuperadmin = await isSystemSuperadmin(supabase, userId);
  if (isSuperadmin) {
    return {
      hierarchyLevel: Number.MAX_SAFE_INTEGER,
      permissions: ALL_PERMISSIONS as unknown as string[],
      isSuperadmin: true
    };
  }
  const authority = await resolveTenantAuthority(supabase, userId, tenantId);
  return {
    hierarchyLevel: authority?.hierarchyLevel ?? null,
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
 * Apakah user adalah admin/owner tenant (hierarchy_level >= 50) atau superadmin.
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
  return authority.hierarchyLevel != null && authority.hierarchyLevel >= 50;
}

/**
 * Apakah user boleh mengelola billing tenant (cancel/downgrade/resume/trial).
 * True bila: superadmin sistem, ATAU punya permission `billing.manage`,
 * ATAU admin/owner (hierarchy_level >= 50).
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
  if (authority.permissions.includes("billing.manage")) return true;
  return authority.hierarchyLevel != null && authority.hierarchyLevel >= 50;
}
