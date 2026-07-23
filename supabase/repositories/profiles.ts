import { SupabaseClient } from "@supabase/supabase-js";

export async function profileRepository(supabase: SupabaseClient) {
  return {
    query() {
      return supabase.from("profiles");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("profiles").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("profiles").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("profiles").delete().eq("id", id);
    }
  };
}
