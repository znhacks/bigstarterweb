import { SupabaseClient } from "@supabase/supabase-js";

export async function screenshotLogRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("screenshot_logs");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("screenshot_logs").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("screenshot_logs").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("screenshot_logs").delete().eq("id", id);
    }
  };
}
