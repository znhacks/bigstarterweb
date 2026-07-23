import { SupabaseClient } from "@supabase/supabase-js";

export async function permissionRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("permissions");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("permissions").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("permissions").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("permissions").delete().eq("id", id);
    }
  };
}
