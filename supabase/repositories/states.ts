import { SupabaseClient } from "@supabase/supabase-js";

export async function stateRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("states");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("states").insert(values);
    },

    update(id: number, values: Record<string, any>) {
      return supabase.from("states").update(values).eq("id", id);
    },

    delete(id: number) {
      return supabase.from("states").delete().eq("id", id);
    }
  };
}
