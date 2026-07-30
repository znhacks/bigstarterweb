import { SupabaseClient } from "@supabase/supabase-js";

export async function notificationCategoryRepository(
  supabase: SupabaseClient<any, any, any, any, any>
) {
  return {
    query() {
      return supabase.from("notification_categories");
    },
    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("notification_categories").insert(values);
    },
    update(id: string, values: Record<string, any>) {
      return supabase.from("notification_categories").update(values).eq("id", id);
    },
    delete(id: string) {
      return supabase.from("notification_categories").delete().eq("id", id);
    }
  };
}
