import { SupabaseClient } from "@supabase/supabase-js";

export async function cityRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("cities");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("cities").insert(values);
    },

    update(id: number, values: Record<string, any>) {
      return supabase.from("cities").update(values).eq("id", id);
    },

    delete(id: number) {
      return supabase.from("cities").delete().eq("id", id);
    }
  };
}
