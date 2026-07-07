import type { PermissionName } from "./permissions";

/** Bentuk tenant aktif (dari join memberships → tenants). */
export interface ActiveTenant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

/**
 * Otoritas pengguna yang sudah di-resolve untuk satu membership aktif:
 * role apa, level hirarki-nya, dan himpunan permission efektif
 * (memberships.role_id → roles → role_permissions → permissions).
 */
export interface ResolvedAuthority {
  roleId: string;
  roleName: string;
  hierarchyLevel: number;
  permissions: PermissionName[];
}

/**
 * Hasil `getActiveTenant` setelah refactor — otoritas + tenant aktif.
 * Dipakai oleh `requirePermission` dan komponen server/klien.
 */
export interface ActiveTenantContext extends ResolvedAuthority {
  tenant: ActiveTenant;
}
