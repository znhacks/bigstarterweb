import { SupabaseClient } from "@supabase/supabase-js";

export async function notificationRepository(
  supabase: SupabaseClient<any, any, any, any, any>
) {
  return {
    query() {
      return supabase.from("notifications");
    },
    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("notifications").insert(values);
    },
    update(id: string, values: Record<string, any>) {
      return supabase.from("notifications").update(values).eq("id", id);
    },
    delete(id: string) {
      return supabase.from("notifications").delete().eq("id", id);
    }
  };
}
