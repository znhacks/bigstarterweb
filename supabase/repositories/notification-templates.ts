import { SupabaseClient } from "@supabase/supabase-js";

export async function notificationTemplateRepository(
  supabase: SupabaseClient<any, any, any, any, any>
) {
  return {
    query() {
      return supabase.from("notification_templates");
    },
    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("notification_templates").insert(values);
    },
    update(id: string, values: Record<string, any>) {
      return supabase.from("notification_templates").update(values).eq("id", id);
    },
    delete(id: string) {
      return supabase.from("notification_templates").delete().eq("id", id);
    }
  };
}
