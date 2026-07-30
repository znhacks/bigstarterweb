import { SupabaseClient } from "@supabase/supabase-js";

export async function notificationPreferenceRepository(
  supabase: SupabaseClient<any, any, any, any, any>
) {
  return {
    query() {
      return supabase.from("notification_preferences");
    },
    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("notification_preferences").insert(values);
    },
    update(userId: string, values: Record<string, any>) {
      return supabase.from("notification_preferences").update(values).eq("user_id", userId);
    },
    upsert(values: Record<string, any>) {
      return supabase.from("notification_preferences").upsert(values, { onConflict: "user_id" });
    },
    delete(userId: string) {
      return supabase.from("notification_preferences").delete().eq("user_id", userId);
    }
  };
}
