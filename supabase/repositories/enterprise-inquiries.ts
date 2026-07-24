import { SupabaseClient } from "@supabase/supabase-js";

export async function enterpriseInquiryRepository(supabase: SupabaseClient<any, any, any, any, any>) {
  return {
    query() {
      return supabase.from("enterprise_inquiries");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("enterprise_inquiries").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("enterprise_inquiries").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("enterprise_inquiries").delete().eq("id", id);
    },

    /** Update status lifecycle (new → contacted → closed). */
    markStatus(id: string, status: string) {
      return supabase
        .from("enterprise_inquiries")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
    }
  };
}
