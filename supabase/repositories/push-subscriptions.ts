import { SupabaseClient } from "@supabase/supabase-js";

export async function pushSubscriptionRepository(
  supabase: SupabaseClient<any, any, any, any, any>
) {
  return {
    query() {
      return supabase.from("push_subscriptions");
    },
    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("push_subscriptions").insert(values);
    },
    upsert(values: Record<string, any>) {
      // Idempoten per (endpoint, user_id) — re-subscribe browser sama tidak duplikat.
      return supabase
        .from("push_subscriptions")
        .upsert(values, { onConflict: "endpoint,user_id" });
    },
    delete(id: string) {
      return supabase.from("push_subscriptions").delete().eq("id", id);
    }
  };
}
