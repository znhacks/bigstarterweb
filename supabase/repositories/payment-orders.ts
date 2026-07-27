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

    findByProviderOrder(provider: string, providerOrderId: string) {
      return supabase
        .from("payment_orders")
        .select("*")
        .eq("provider", provider)
        .eq("provider_order_id", providerOrderId)
        .maybeSingle();
    },

    findPendingByContext(provider: string, tenantId: string, planId: string) {
      return supabase
        .from("payment_orders")
        .select("*")
        .eq("provider", provider)
        .eq("tenant_id", tenantId)
        .eq("plan_id", planId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    },

    markStatus(id: string, status: string, extra: Record<string, any> = {}) {
      return supabase
        .from("payment_orders")
        .update({ status, updated_at: new Date().toISOString(), ...extra })
        .eq("id", id);
    }
  };
}
