import { SupabaseClient } from "@supabase/supabase-js";

export async function planRepository(supabase: SupabaseClient) {
  return {
    query() {
      return supabase.from("plans");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("plans").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("plans").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("plans").delete().eq("id", id);
    }
  };
}
