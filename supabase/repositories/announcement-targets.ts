import { SupabaseClient } from "@supabase/supabase-js";

export async function announcementTargetRepository(
  supabase: SupabaseClient<any, any, any, any, any>
) {
  return {
    query() {
      return supabase.from("announcement_targets");
    },
    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("announcement_targets").insert(values);
    },
    update(id: string, values: Record<string, any>) {
      return supabase.from("announcement_targets").update(values).eq("id", id);
    },
    delete(id: string) {
      return supabase.from("announcement_targets").delete().eq("id", id);
    }
  };
}
