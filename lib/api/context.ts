import { os } from "@orpc/server";
import type { Auth } from "./auth";
import { unauthorized, forbidden } from "./errors";
import { supabaseAdmin } from "./supabase-server";
import { resolveTenantPermissions } from "@/lib/billing/tenant-auth";
import { hasPermission } from "@/lib/rbac";
import type { PermissionName } from "@/lib/rbac/permissions";

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

/**
 * Enforce RBAC pada mutasi API. Wajib dashboard session (API key hanya bisa membaca),
 * lalu cek permission efektif (superadmin bypass). Throw FORBIDDEN bila tidak memenuhi.
 */
export async function requirePermission(context: ApiContext, perm: PermissionName): Promise<void> {
  const { userId, tenantId } = getSession(context);
  const perms = await resolveTenantPermissions(supabaseAdmin, userId, tenantId);
  if (!hasPermission(perms, perm)) {
    throw forbidden(`Permission "${perm}" diperlukan untuk aksi ini.`);
  }
}
