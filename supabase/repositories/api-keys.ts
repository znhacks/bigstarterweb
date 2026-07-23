import { SupabaseClient } from "@supabase/supabase-js";

export async function apiKeyRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("api_keys");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("api_keys").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("api_keys").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("api_keys").delete().eq("id", id);
    }
  };
}
