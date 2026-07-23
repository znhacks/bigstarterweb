import { SupabaseClient } from "@supabase/supabase-js";

export async function projectRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("projects");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("projects").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("projects").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("projects").delete().eq("id", id);
    }
  };
}
