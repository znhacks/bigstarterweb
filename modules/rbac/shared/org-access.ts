// modules/rbac/shared/org-access.ts
//
// Aturan akses menu/halaman organisation berbasis permission, bukan hierarchy.
// Sumber kebenaran terpusat — dipakai oleh:
//   - layout organisation (server) → menyembunyikan menu
//   - komponen nav (client) → tipe route
//   - gate `requireOrgRoute` di module auth (server) → memblokir akses langsung
//
// Pure module: TIDAK boleh import supabase/server agar aman dipakai di client.

import { PERMISSIONS, type PermissionName } from "./permissions";

export type OrgRouteSegment = "general" | "member" | "history-billing" | "appearance";

/**
 * Permission minimum untuk mengakses tiap sub-route organisation.
 * Urutan di sini = urutan tampil di navigasi.
 */
export const ORG_ROUTE_REQUIRED_PERMISSIONS: Record<OrgRouteSegment, PermissionName[]> = {
  general: [PERMISSIONS.organizationRead],
  member: [PERMISSIONS.membersManage, PERMISSIONS.membersInvite, PERMISSIONS.membersRemove],
  "history-billing": [PERMISSIONS.billingRead, PERMISSIONS.billingManage],
  appearance: [PERMISSIONS.organizationUpdate, PERMISSIONS.settingsView]
};

/**
 * Apakah user dengan permission tertentu boleh mengakses route tertentu?
 * permissions == null / kosong → selalu ditolak.
 */
export function canAccessOrgRoute(
  segment: string,
  permissions: Array<string> | null | undefined
): boolean {
  if (!permissions || permissions.length === 0) return false;
  const required = (ORG_ROUTE_REQUIRED_PERMISSIONS as Record<string, PermissionName[]>)[segment];
  if (!required) return true;
  return required.some((permission) => permissions.includes(permission));
}

/**
 * Daftar route yang boleh diakses pengguna, terurut sesuai ORG_ROUTE_REQUIRED_PERMISSIONS.
 * Dipakai layout untuk merender hanya menu yang relevan per permission.
 */
export function getAccessibleOrgRoutes(
  permissions: Array<string> | null | undefined
): OrgRouteSegment[] {
  return (Object.keys(ORG_ROUTE_REQUIRED_PERMISSIONS) as OrgRouteSegment[]).filter((s) =>
    canAccessOrgRoute(s, permissions)
  );
}
