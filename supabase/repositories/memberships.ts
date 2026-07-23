import { SupabaseClient } from "@supabase/supabase-js";


export async function membershipRepository(supabase: SupabaseClient) {
  return {
    query() {
      return supabase.from("memberships");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("memberships").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("memberships").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("memberships").delete().eq("id", id);
    }
  };
}
