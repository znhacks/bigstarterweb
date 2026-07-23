import { SupabaseClient } from "@supabase/supabase-js";

export async function couponRedemptionRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("coupon_redemptions");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("coupon_redemptions").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("coupon_redemptions").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("coupon_redemptions").delete().eq("id", id);
    }
  };
}
