import { SupabaseClient } from "@supabase/supabase-js";

export async function roleRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("roles");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("roles").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("roles").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("roles").delete().eq("id", id);
    }
  };
}
