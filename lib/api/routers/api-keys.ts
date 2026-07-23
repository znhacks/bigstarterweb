import * as z from "zod";
import { o, getTenantId, getSession } from "../context";
import { supabaseAdmin } from "../supabase-server";
import { apiKeyRepository } from "@/supabase/repositories/api-keys";
import { apiKeySchema, uuid } from "../schemas";
import { notFound, dbError } from "../errors";
import { generateApiKey, hashApiKey, apiKeyPrefix } from "../crypto";

/**
 * Lifecycle of an API key. For security, CREATE is dashboard-session-only — an
 * API key can never mint another key. LIST and REVOKE are also available via an
 * existing API key (self-service), scoped to that key's tenant.
 */

const rowsFor = async (tenantId: string) => {
  const apiKeyRepo = await apiKeyRepository(supabaseAdmin);
  return apiKeyRepo
    .query()
    .select("id, name, key_prefix, last_used_at, created_at, revoked_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
};

export const listApiKeys = o
  .route({
    method: "GET",
    path: "/api-keys",
    tags: ["API Keys"],
    summary: "List API keys",
    description: "Returns metadata only (prefix, last-used, revocation). The full secret is never retrievable."
  })
  .output(z.array(apiKeySchema))
  .handler(async ({ context }) => {
    const tenantId = getTenantId(context);
    const { data, error } = await (await rowsFor(tenantId));
    if (error) throw dbError(error);
    return data ?? [];
  });

const createdApiKeyOutput = apiKeySchema.extend({
  /** Full secret — returned exactly once, only at creation time. */
  key: z.string()
});

export const createApiKey = o
  .route({
    method: "POST",
    path: "/api-keys",
    tags: ["API Keys"],
    summary: "Create an API key",
    description: "Dashboard session only. The full key is returned once — store it securely."
  })
  .input(z.object({ name: z.string().min(1).max(80) }))
  .output(createdApiKeyOutput)
  .handler(async ({ input, context }) => {
    const session = getSession(context); // session-only — prevents key-minting escalation
    const fullKey = generateApiKey();

    const apiKeyRepo = await apiKeyRepository(supabaseAdmin);
    const { data, error } = await apiKeyRepo
      .query()
      .insert({
        tenant_id: session.tenantId,
        name: input.name,
        key_prefix: apiKeyPrefix(fullKey),
        key_hash: hashApiKey(fullKey)
      })
      .select("id, name, key_prefix, last_used_at, created_at, revoked_at")
      .single();
    if (error) throw dbError(error);

    return { ...data, key: fullKey };
  });

export const revokeApiKey = o
  .route({
    method: "DELETE",
    path: "/api-keys/{id}",
    tags: ["API Keys"],
    summary: "Revoke an API key"
  })
  .input(z.object({ id: uuid }))
  .output(z.object({ id: uuid, revoked: z.literal(true) }))
  .handler(async ({ input, context }) => {
    const tenantId = getTenantId(context);
    const apiKeyRepo = await apiKeyRepository(supabaseAdmin);
    const { data, error } = await apiKeyRepo
      .query()
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", input.id)
      .eq("tenant_id", tenantId) // cannot revoke another tenant's key
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound("Active API key not found in your tenant.");
    return { id: input.id, revoked: true as const };
  });

export const apiKeysRouter = { list: listApiKeys, create: createApiKey, revoke: revokeApiKey };
