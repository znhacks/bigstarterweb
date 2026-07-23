import { SupabaseClient } from "@supabase/supabase-js";

export async function villageRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("desa");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("desa").insert(values);
    },

    update(id: number, values: Record<string, any>) {
      return supabase.from("desa").update(values).eq("id", id);
    },

    delete(id: number) {
      return supabase.from("desa").delete().eq("id", id);
    }
  };
}
