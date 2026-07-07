/**
 * Katalog permission — SINGLE SOURCE OF TRUTH di sisi TypeScript.
 *
 * Nama permission di bawah HARUS identik 1:1 dengan baris di tabel
 * `permissions` (lihat `supabase/migrations/rbac-seed.sql`). Konvensi
 * penamaan: `domain.action`.
 *
 * PENTING — jalur superadmin terpisah:
 * "superadmin" BUKAN role di tabel `roles`. Superadmin dideteksi lewat
 * `user.app_metadata.role === "superadmin"` (lihat `lib/auth.ts` ->
 * `requireSuperadmin`). Jangan tambahkan row superadmin ke tabel roles,
 * dan jangan gate halaman superadmin lewat sistem permission di sini.
 */

export const PERMISSIONS = {
  // Organization
  organizationRead: "organization.read",
  organizationUpdate: "organization.update",
  organizationDelete: "organization.delete",

  // Members
  membersRead: "members.read",
  membersInvite: "members.invite",
  membersManage: "members.manage",
  membersRemove: "members.remove",

  // Billing
  billingRead: "billing.read",
  billingManage: "billing.manage",

  // API & integrations
  apiKeysManage: "api_keys.manage",

  // Navigation / general
  dashboardView: "dashboard.view",
  settingsView: "settings.view"
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Daftar semua nama permission (berguna untuk validasi sinkronisasi
 * dengan seed DB: `Object.values(PERMISSIONS)` harus = himpunan
 * `permissions.name` di database).
 */
export const ALL_PERMISSIONS: PermissionName[] = Object.values(PERMISSIONS);

/**
 * Pengelompokan permission berdasarkan domain, dipakai UI matrix
 * assignment permission-per-role di Superadmin.
 */
export const PERMISSION_GROUPS: {
  domain: string;
  label: string;
  names: PermissionName[];
}[] = [
  {
    domain: "organization",
    label: "Organization",
    names: [
      PERMISSIONS.organizationRead,
      PERMISSIONS.organizationUpdate,
      PERMISSIONS.organizationDelete
    ]
  },
  {
    domain: "members",
    label: "Members",
    names: [
      PERMISSIONS.membersRead,
      PERMISSIONS.membersInvite,
      PERMISSIONS.membersManage,
      PERMISSIONS.membersRemove
    ]
  },
  {
    domain: "billing",
    label: "Billing",
    names: [PERMISSIONS.billingRead, PERMISSIONS.billingManage]
  },
  {
    domain: "api",
    label: "API Keys",
    names: [PERMISSIONS.apiKeysManage]
  },
  {
    domain: "general",
    label: "General",
    names: [PERMISSIONS.dashboardView, PERMISSIONS.settingsView]
  }
];
