import { SupabaseClient } from "@supabase/supabase-js";

export async function planPriceRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("plan_prices");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("plan_prices").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("plan_prices").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("plan_prices").delete().eq("id", id);
    }
  };
}
