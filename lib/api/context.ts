import { os } from "@orpc/server";
import type { Auth } from "./auth";
import { unauthorized } from "./errors";

/**
 * Base context shared by every procedure. `auth` is resolved once per request in
 * the Hono route and threaded into both the RPC and OpenAPI handlers.
 */
export type ApiContext = { auth: Auth };

export const o = os.$context<ApiContext>();

/** Any authenticated identity (API key or dashboard session). */
export function getAuth(context: ApiContext): NonNullable<Auth> {
  if (!context.auth) throw unauthorized("Authentication required.");
  return context.auth;
}

/** A dashboard session specifically (used for API key creation — no key-minting via API key). */
export function getSession(context: ApiContext): {
  kind: "session";
  userId: string;
  tenantId: string;
} {
  const auth = getAuth(context);
  if (auth.kind !== "session") throw unauthorized("Dashboard session required for this action.");
  return auth;
}

/** Resolve the effective tenant id for either auth flavour. */
export function getTenantId(context: ApiContext): string {
  return getAuth(context).tenantId;
}
