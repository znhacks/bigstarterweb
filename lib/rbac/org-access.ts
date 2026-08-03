// lib/rbac/org-access.ts
//
// Aturan akses menu/halaman organisation berbasis ROLE (hierarchy level),
// BUKAN permission. Sumber kebenaran terpusat — dipakai oleh:
//   - layout organisation (server) → menyembunyikan menu
//   - komponen nav (client) → tipe route
//   - gate `requireOrgRoute` di lib/auth.ts (server) → memblokir akses langsung
//
// Pure module: TIDAK boleh import supabase/server agar aman dipakai di client.
// Threshold mengikuti config/rbac.ts: Member=10, Admin=50, Owner=100.

export type OrgRouteSegment = "general" | "member" | "history-billing" | "appearance";

/**
 * Minimum hierarchy level untuk mengakses tiap sub-route organisation.
 * Urutan di sini = urutan tampil di navigasi.
 */
export const ORG_ROUTE_MIN_HIERARCHY: Record<OrgRouteSegment, number> = {
  general: 10, // Member+
  member: 50, // Admin+
  "history-billing": 100, // Owner only
  appearance: 100 // Owner only
};

/**
 * Apakah sebuah hierarchy level boleh mengakses route tertentu?
 * hierarchy == null (tidak punya membership / role) → selalu ditolak.
 */
export function canAccessOrgRoute(
  segment: string,
  hierarchy: number | null | undefined
): boolean {
  if (hierarchy == null) return false;
  const min = (ORG_ROUTE_MIN_HIERARCHY as Record<string, number>)[segment];
  return min == null ? true : hierarchy >= min;
}

/**
 * Daftar route yang boleh diakses pengguna, terurut sesuai ORG_ROUTE_MIN_HIERARCHY.
 * Dipakai layout untuk merender hanya menu yang relevan per role.
 */
export function getAccessibleOrgRoutes(
  hierarchy: number | null | undefined
): OrgRouteSegment[] {
  return (Object.keys(ORG_ROUTE_MIN_HIERARCHY) as OrgRouteSegment[]).filter((s) =>
    canAccessOrgRoute(s, hierarchy)
  );
}
