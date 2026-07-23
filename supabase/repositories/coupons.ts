import { SupabaseClient } from "@supabase/supabase-js";

export async function couponRepository(supabase: SupabaseClient) {
  return {
    query() {
      return supabase.from("coupons");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("coupons").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("coupons").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("coupons").delete().eq("id", id);
    }
  };
}
