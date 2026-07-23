import { SupabaseClient } from "@supabase/supabase-js";

export async function countryRepository(supabase: SupabaseClient) {
  return {
    query() {
      return supabase.from("countries");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("countries").insert(values);
    },

    update(id: number, values: Record<string, any>) {
      return supabase.from("countries").update(values).eq("id", id);
    },

    delete(id: number) {
      return supabase.from("countries").delete().eq("id", id);
    }
  };
}
