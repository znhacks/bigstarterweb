// modules/rbac/server/services/sync.ts
//
// Server-only: sinkronisasi definisi role & permission ke DB.
// Dipanggil oleh scripts/sync-rbac.ts (npm run db:sync-rbac).

import {
  ALL_PERMISSIONS,
  PERMISSION_DESCRIPTIONS
} from "@/modules/rbac/shared/permissions";
import {
  DEFAULT_GRANTS,
  ROLE_DEFINITIONS,
  type SyncResult
} from "@/modules/rbac/shared/config";
import { roleRepository } from "@/supabase/repositories/roles";
import { permissionRepository } from "@/supabase/repositories/permissions";
import { rolePermissionRepository } from "@/supabase/repositories/role-permissions";

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
        .upsert({ name: perm, description: PERMISSION_DESCRIPTIONS[perm] || "" }, { onConflict: "name" });

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
