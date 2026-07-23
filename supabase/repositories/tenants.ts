import { SupabaseClient } from "@supabase/supabase-js";

export async function tenantRepository(supabase: SupabaseClient) {
  return {
    query() {
      return supabase.from("tenants");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("tenants").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("tenants").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("tenants").delete().eq("id", id);
    }
  };
}
