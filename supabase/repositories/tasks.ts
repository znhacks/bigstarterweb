import { SupabaseClient } from "@supabase/supabase-js";

export async function taskRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("tasks");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("tasks").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("tasks").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("tasks").delete().eq("id", id);
    }
  };
}
