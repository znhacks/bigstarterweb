import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function buildClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    _client ??= buildClient();
    return Reflect.get(_client as object, prop);
  }
});
