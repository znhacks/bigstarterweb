import { SupabaseClient } from "@supabase/supabase-js";

export async function invitationRepository(supabase: SupabaseClient) {
  return {
    query() {
      return supabase.from("invitations");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("invitations").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("invitations").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("invitations").delete().eq("id", id);
    }
  };
}
