// config/rbac.ts
//
// DECLARATIVE ROLE CATALOGUE — boilerplate reference utk developer.
// File ini mendefinisikan roles, hierarchy, dan default grants dalam TypeScript.
// DB (tabel roles/role_permissions) adalah runtime source of truth; file ini
// adalah deklarasi yg mencerminkan/menyinkronkan DB.
//
// === CARA PAKAI (utk developer boilerplate) ===
// 1. Tambah/ubah role atau grant di sini.
// 2. Jalankan `syncRbacToDb(supabaseAdmin)` utk idempotent upsert ke DB.
//    Atau copy SQL equivalent dari comments ke Supabase SQL Editor.
// 3. `lib/rbac/permissions.ts` adalah katalog PERMISSION (domain.action) —
//    tambah permission baru di sana DULU, lalu reference di DEFAULT_GRANTS.
//
// HIRARKI: angka lebih tinggi = lebih berkuasa. canAssignRole(myLevel > targetLevel).

import { ALL_PERMISSIONS, PERMISSIONS, type PermissionName } from "@/lib/rbac/permissions";
import { roleRepository } from "@/supabase/repositories/roles";
import { permissionRepository } from "@/supabase/repositories/permissions";
import { rolePermissionRepository } from "@/supabase/repositories/role-permissions";

export interface RoleDefinition {
  /** Nama role di DB (case-sensitive, harus match `roles.name`). */
  name: string;
  /** Label human-readable utk UI. */
  label: string;
  /** Level hirarki (Member=10, Admin=50, Owner=100). Gap utk future roles. */
  hierarchy: number;
  /** Deskripsi singkat (tooltip/help). */
  description: string;
  /** Warna badge UI (opsional). */
  color?: string;
}

/** Tipe data pengembalian untuk skrip pengeksekusi CLI */
export interface SyncResult {
  success: boolean;
  error?: string;
}

/**
 * Daftar role default. Developer dapat add role baru di sini.
 * HIRARKI: 10 (Member) < 50 (Admin) < 100 (Owner).
 */
export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    name: "Member",
    label: "Member",
    hierarchy: 10,
    description: "Read-only access + basic interactions (create tasks, view billing).",
    color: "bg-blue-500/10 text-blue-600"
  },
  {
    name: "Admin",
    label: "Admin",
    hierarchy: 50,
    description: "Operational writes: manage members, billing, tasks — cannot delete org.",
    color: "bg-amber-500/10 text-amber-600"
  },
  {
    name: "Owner",
    label: "Owner",
    hierarchy: 100,
    description: "Full control including organization deletion. Untransferable top-level.",
    color: "bg-emerald-500/10 text-emerald-600"
  }
];

/**
 * Default grants: role name → list of permission strings.
 * Mirror dari `supabase/migrations/rbac-seed.sql` + `tasks-schema-rbac.sql`.
 * Developer: tambah permission ke array role yg sesuai setelah deklarasi di permissions.ts.
 */
export const DEFAULT_GRANTS: Record<string, PermissionName[]> = {
  Member: [
    PERMISSIONS.organizationRead,
    PERMISSIONS.membersRead,
    PERMISSIONS.billingRead,
    PERMISSIONS.tasksRead,
    PERMISSIONS.tasksCreate,
    PERMISSIONS.dashboardView,
    PERMISSIONS.settingsView
  ],
  Admin: [
    // Inherits Member reads + operational writes
    PERMISSIONS.organizationRead,
    PERMISSIONS.organizationUpdate,
    PERMISSIONS.membersRead,
    PERMISSIONS.membersInvite,
    PERMISSIONS.membersManage,
    PERMISSIONS.membersRemove,
    PERMISSIONS.billingRead,
    PERMISSIONS.billingManage,
    PERMISSIONS.apiKeysManage,
    PERMISSIONS.tasksRead,
    PERMISSIONS.tasksCreate,
    PERMISSIONS.tasksUpdate,
    PERMISSIONS.tasksDelete,
    PERMISSIONS.dashboardView,
    PERMISSIONS.settingsView
  ],
  Owner: ALL_PERMISSIONS // semua permission
};

/** Ambil RoleDefinition berdasarkan nama role. */
export function getRoleByName(name: string): RoleDefinition | undefined {
  return ROLE_DEFINITIONS.find((r) => r.name === name);
}

/** Ambil RoleDefinition berdasarkan level hirarki (nearest match). */
export function getRoleByHierarchy(level: number): RoleDefinition | undefined {
  return [...ROLE_DEFINITIONS]
    .sort((a, b) => b.hierarchy - a.hierarchy)
    .find((r) => level >= r.hierarchy);
}

/** Ambil daftar permission default utk sebuah role. */
export function getDefaultGrants(roleName: string): PermissionName[] {
  return DEFAULT_GRANTS[roleName] ?? [];
}

/**
 * Utility: sinkronkan roles + grants dari config ini ke DB.
 * Idempotent: upsert roles, reseed permissions, reseed role_permissions.
 * Hanya boleh dipanggil server-side (service-role).
 *
 * @example
 * import { supabaseAdmin } from "@/lib/api/supabase-server";
 * await syncRbacToDb(supabaseAdmin);
 */
export async function syncRbacToDb(supabaseAdmin: any): Promise<SyncResult> {
  try {
    const roleRepo = await roleRepository(supabaseAdmin);
    const permissionRepo = await permissionRepository(supabaseAdmin);
    const rolePermissionRepo = await rolePermissionRepository(supabaseAdmin);

    // 1. Upsert roles
    for (const role of ROLE_DEFINITIONS) {
      const { error: roleError } = await roleRepo
        .query()
        .upsert({ name: role.name, hierarchy_level: role.hierarchy }, { onConflict: "name" });

      if (roleError) throw roleError;
    }

    // 2. Ensure all permissions exist (from permissions.ts catalog)
    for (const perm of ALL_PERMISSIONS) {
      const { error: permError } = await permissionRepo
        .query()
        .upsert({ name: perm }, { onConflict: "name" });

      if (permError) throw permError;
    }

    // 3. Sync grants (role_permissions)
    for (const [roleName, perms] of Object.entries(DEFAULT_GRANTS)) {
      const { data: role, error: fetchRoleError } = await roleRepo
        .query()
        .select("id")
        .eq("name", roleName)
        .maybeSingle();

      if (fetchRoleError) throw fetchRoleError;
      if (!role) continue;

      for (const permName of perms) {
        const { data: perm, error: fetchPermError } = await permissionRepo
          .query()
          .select("id")
          .eq("name", permName)
          .maybeSingle();

        if (fetchPermError) throw fetchPermError;
        if (!perm) continue;

        const { error: rpError } = await rolePermissionRepo
          .query()
          .upsert(
            { role_id: role.id, permission_id: perm.id },
            { onConflict: "role_id,permission_id" }
          );

        if (rpError) throw rpError;
      }
    }

    console.log("[RBAC] Sync selesai:", ROLE_DEFINITIONS.length, "roles,", ALL_PERMISSIONS.length, "permissions.");
    return { success: true };
  } catch (err: any) {
    console.error("[RBAC] Sync gagal:", err);
    return { success: false, error: err.message || "Unknown error occurred" };
  }
}