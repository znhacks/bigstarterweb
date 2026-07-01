import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 * Bypasses Row Level Security — NEVER import this from client code.
 *
 * Centralises the inline `createClient(url, SERVICE_ROLE_KEY)` pattern that was
 * duplicated across `app/api/billing/verify/route.ts`, `app/api/invite/route.ts`,
 * `lib/billing/enforcer.ts`, etc. The public API layer reads/writes tenant-scoped
 * data through this single client.
 *
 * Lazy: the client is only constructed on first property access, so importing the
 * router (e.g. for OpenAPI spec generation) does NOT require the env vars to be
 * present. A handler that actually queries the DB will throw a clear error if the
 * service-role key is missing.
 */
let _client: SupabaseClient | null = null;

function buildClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service-role env vars are not set. Define NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
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
