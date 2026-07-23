import { SupabaseClient } from "@supabase/supabase-js";

export async function subscriptionRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("subscriptions");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("subscriptions").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("subscriptions").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("subscriptions").delete().eq("id", id);
    }
  };
}
