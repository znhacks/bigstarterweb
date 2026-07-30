import { SupabaseClient } from "@supabase/supabase-js";

export async function announcementRepository(
  supabase: SupabaseClient<any, any, any, any, any>
) {
  return {
    query() {
      return supabase.from("announcements");
    },
    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("announcements").insert(values);
    },
    update(id: string, values: Record<string, any>) {
      return supabase.from("announcements").update(values).eq("id", id);
    },
    delete(id: string) {
      return supabase.from("announcements").delete().eq("id", id);
    }
  };
}
