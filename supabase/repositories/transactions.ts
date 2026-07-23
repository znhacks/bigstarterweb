import { SupabaseClient } from "@supabase/supabase-js";

export async function transactionRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("transactions");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("transactions").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("transactions").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("transactions").delete().eq("id", id);
    }
  };
}
