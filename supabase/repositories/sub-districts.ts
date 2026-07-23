import { SupabaseClient } from "@supabase/supabase-js";

export async function subdistrictRepository(supabase: SupabaseClient) {
  return {
    query() {
      return supabase.from("kecamatan");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("kecamatan").insert(values);
    },

    update(id: number, values: Record<string, any>) {
      return supabase.from("kecamatan").update(values).eq("id", id);
    },

    delete(id: number) {
      return supabase.from("kecamatan").delete().eq("id", id);
    }
  };
}
