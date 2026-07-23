import { SupabaseClient } from "@supabase/supabase-js";

export async function otpCodeRepository(supabase: SupabaseClient) {
  return {
    query() {
      return supabase.from("otp_codes");
    },

    insert(values: Record<string, any> | Record<string, any>[]) {
      return supabase.from("otp_codes").insert(values);
    },

    update(id: string, values: Record<string, any>) {
      return supabase.from("otp_codes").update(values).eq("id", id);
    },

    delete(id: string) {
      return supabase.from("otp_codes").delete().eq("id", id);
    }
  };
}
