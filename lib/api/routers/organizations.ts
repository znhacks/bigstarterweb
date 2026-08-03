import * as z from "zod";
import { getTenantId, requirePermission } from "../context";
import { protectedProcedure, sessionProcedure } from "../procedures";
import { supabaseAdmin } from "../supabase-server";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { organizationSchema } from "../schemas";
import { notFound, dbError } from "../errors";
import { PERMISSIONS } from "@/modules/rbac/shared";

/**
 * The API key (or dashboard session) is bound to a single tenant, so these
 * operate on "the current organization" — no path id.
 */
export const getOrganization = protectedProcedure
  .route({
    method: "GET",
    path: "/organization",
    tags: ["Organization"],
    summary: "Get the current organization"
  })
  .output(organizationSchema)
  .handler(async ({ context }) => {
    const tenantId = getTenantId(context);
    const tenantRepo = await tenantRepository(supabaseAdmin);
    const { data, error } = await tenantRepo
      .query()
      .select("*")
      .eq("id", tenantId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound("Organization not found.");
    return data;
  });

export const updateOrganization = sessionProcedure
  .route({
    method: "PATCH",
    path: "/organization",
    tags: ["Organization"],
    summary: "Update the current organization"
  })
  .input(z.object({ name: z.string().min(1).max(255).optional(), logo: z.string().url().optional() }))
  .output(organizationSchema)
  .handler(async ({ input, context }) => {
    await requirePermission(context, PERMISSIONS.organizationUpdate);
    const tenantId = getTenantId(context);
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.logo !== undefined) patch.logo = input.logo;
    if (Object.keys(patch).length === 0) throw notFound("No fields to update.");

    const tenantRepo = await tenantRepository(supabaseAdmin);
    const { data, error } = await tenantRepo
      .query()
      .update(patch)
      .eq("id", tenantId)
      .select("*")
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound("Organization not found.");
    return data;
  });

export const organizationsRouter = { get: getOrganization, update: updateOrganization };
