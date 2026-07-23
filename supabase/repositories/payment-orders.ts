import { SupabaseClient } from "@supabase/supabase-js";

export async function paymentOrderRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("payment_orders");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("payment_orders").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("payment_orders").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("payment_orders").delete().eq("id", id);
    },

    /**
     * Lookup order by (provider, provider_order_id) — id sesi/invoice/order dari provider
     * yang selalu di-echo pada callback webhook. Dipakai webhook untuk memulihkan context
     * (tenant/plan/interval/coupon/amount) dari DB kita, tidak bergantung echo metadata.
     */
    findByProviderOrder(provider: string, providerOrderId: string) {
      return supabase
        .from("payment_orders")
        .select("*")
        .eq("provider", provider)
        .eq("provider_order_id", providerOrderId)
        .maybeSingle();
    },

    /** Update status lifecycle (pending → paid/failed/expired). */
    markStatus(id: string, status: string, extra: Record<string, any> = {}) {
      return supabase
        .from("payment_orders")
        .update({ status, updated_at: new Date().toISOString(), ...extra })
        .eq("id", id);
    }
  };
}
