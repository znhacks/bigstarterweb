import { ALL_PERMISSIONS, PERMISSIONS, type PermissionName } from "@/lib/rbac/permissions";
import { roleRepository } from "@/supabase/repositories/roles";
import { permissionRepository } from "@/supabase/repositories/permissions";
import { rolePermissionRepository } from "@/supabase/repositories/role-permissions";

export interface RoleDefinition {
  name: string;

  label: string;

  hierarchy: number;

  description: string;

  color?: string;
}

export interface SyncResult {
  success: boolean;
  error?: string;
}

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
  Owner: ALL_PERMISSIONS
};

export function getRoleByName(name: string): RoleDefinition | undefined {
  return ROLE_DEFINITIONS.find((r) => r.name === name);
}

export function getRoleByHierarchy(level: number): RoleDefinition | undefined {
  return [...ROLE_DEFINITIONS]
    .sort((a, b) => b.hierarchy - a.hierarchy)
    .find((r) => level >= r.hierarchy);
}

export function getDefaultGrants(roleName: string): PermissionName[] {
  return DEFAULT_GRANTS[roleName] ?? [];
}

export async function syncRbacToDb(supabaseAdmin: any): Promise<SyncResult> {
  try {
    const roleRepo = await roleRepository(supabaseAdmin);
    const permissionRepo = await permissionRepository(supabaseAdmin);
    const rolePermissionRepo = await rolePermissionRepository(supabaseAdmin);

    for (const role of ROLE_DEFINITIONS) {
      const { error: roleError } = await roleRepo
        .query()
        .upsert({ name: role.name, hierarchy_level: role.hierarchy }, { onConflict: "name" });

      if (roleError) throw roleError;
    }

    for (const perm of ALL_PERMISSIONS) {
      const { error: permError } = await permissionRepo
        .query()
        .upsert({ name: perm }, { onConflict: "name" });

      if (permError) throw permError;
    }

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

    console.log(
      "[RBAC] Sync selesai:",
      ROLE_DEFINITIONS.length,
      "roles,",
      ALL_PERMISSIONS.length,
      "permissions."
    );
    return { success: true };
  } catch (err: any) {
    console.error("[RBAC] Sync gagal:", err);
    return { success: false, error: err.message || "Unknown error occurred" };
  }
}
