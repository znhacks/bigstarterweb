import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "./supabase-server";
import { hashApiKey } from "./crypto";

/**
 * Resolved request identity. Two flavours:
 *  - `apikey`: external caller presenting `Authorization: Bearer sk_live_…`.
 *    Tenant is whatever the key is bound to (`api_keys.tenant_id`).
 *  - `session`: dashboard browser with a Supabase auth cookie. Tenant comes from
 *    the `x-tenant-id` header (the app already tracks `active_org_id` in
 *    localStorage on the client — the UI forwards it here).
 */
export type Auth =
  | { kind: "apikey"; tenantId: string; apiKeyId: string }
  | { kind: "session"; userId: string; tenantId: string }
  | null;

const CLIENT_IP_HEADERS = ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"];

function getClientIp(req: Request): string | null {
  for (const h of CLIENT_IP_HEADERS) {
    const v = req.headers.get(h);
    if (v) return v.split(",")[0].trim();
  }
  return null;
}

/** Validate a bearer token against the `api_keys` table. Returns null if invalid. */
async function resolveApiKeyAuth(req: Request): Promise<Extract<Auth, { kind: "apikey" }> | null> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const key = match[1].trim();
  if (!key.startsWith("sk_live_")) return null;

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, tenant_id, revoked_at")
    .eq("key_hash", hashApiKey(key))
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return null;

  // Fire-and-forget usage telemetry.
  const ip = getClientIp(req);
  supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString(), ...(ip ? { last_used_ip: ip } : {}) })
    .eq("id", data.id)
    .then(({ error }) => error && console.error("[api] last_used_at update failed:", error.message));

  return { kind: "apikey", tenantId: data.tenant_id, apiKeyId: data.id };
}

/** Resolve a dashboard session from the Supabase auth cookie + x-tenant-id header. */
async function resolveSessionAuth(req: Request): Promise<Extract<Auth, { kind: "session" }> | null> {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return null;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Parse cookie header manually — works in any runtime without Next's cookies().
          const raw = req.headers.get("cookie") ?? "";
          return raw
            .split(";")
            .map((c) => c.trim())
            .filter(Boolean)
            .map((c) => {
              const idx = c.indexOf("=");
              return idx === -1
                ? { name: c, value: "" }
                : { name: c.slice(0, idx), value: decodeURIComponent(c.slice(idx + 1)) };
            });
        },
        // Read-only here: API handlers never set auth cookies.
        setAll() {}
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Confirm the user actually belongs to this tenant (defense-in-depth).
  const { data: membership } = await supabaseAdmin
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!membership) return null;

  return { kind: "session", userId: user.id, tenantId };
}

/**
 * Resolve request identity, preferring an API key. Falls back to the dashboard
 * session. Returns null when neither is present/valid → callers treat as anon.
 */
export async function resolveAuth(req: Request): Promise<Auth> {
  return (await resolveApiKeyAuth(req)) ?? (await resolveSessionAuth(req));
}
