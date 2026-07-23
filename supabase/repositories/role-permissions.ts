import { SupabaseClient } from "@supabase/supabase-js";

export async function rolePermissionRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("role_permissions");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("role_permissions").insert(values);
    },

    delete(roleId: string, permissionId: string) {
      return supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_id", permissionId);
    }
  };
}
