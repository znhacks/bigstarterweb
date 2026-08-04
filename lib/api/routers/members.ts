import * as z from "zod";
import { getTenantId, requirePermission } from "../context";
import { protectedProcedure, sessionProcedure } from "../procedures";
import { supabaseAdmin } from "../supabase-server";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { roleRepository } from "@/supabase/repositories/roles";
import { invitationRepository } from "@/supabase/repositories/invitations";
import { memberSchema } from "../schemas";
import { dbError, forbidden, badRequest } from "../errors";
import { checkSeatLimit } from "@/lib/billing/enforcer";
import { PERMISSIONS } from "@/modules/rbac/shared";

export const listMembers = protectedProcedure
  .route({
    method: "GET",
    path: "/members",
    tags: ["Members"],
    summary: "List members",
    description: "Memberships of the current organization, with profile details."
  })
  .output(z.array(memberSchema))
  .handler(async ({ context }) => {
    const tenantId = getTenantId(context);
    const membershipRepo = await membershipRepository(supabaseAdmin);
    const { data, error } = await membershipRepo
      .query()
      .select(
        "id, tenant_id, role_id, roles(name, role_permissions(permissions(name))), app_users(email, full_name, avatar)"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    if (error) throw dbError(error);
    return (data ?? []).map((m: any) => {
      const perms = (m.roles?.role_permissions ?? [])
        .map((rp: any) => rp.permissions?.name)
        .filter((n: any): n is string => typeof n === "string");
      return {
        id: m.id,
        tenant_id: m.tenant_id,
        role_id: m.role_id ?? null,
        role_name: m.roles?.name ?? null,
        permissions: perms,
        email: m.app_users?.email ?? null,
        full_name: m.app_users?.full_name ?? null,
        avatar: m.app_users?.avatar ?? null
      };
    });
  });

const inviteInput = z.object({
  email: z.string().email(),
  roleId: z.string().uuid()
});

const invitationOutput = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  email: z.string(),
  role_id: z.string().uuid().nullable(),
  role_name: z.string().nullable(),
  created_at: z.string().nullable()
});

export const inviteMember = sessionProcedure
  .route({
    method: "POST",
    path: "/members/invite",
    tags: ["Members"],
    summary: "Invite a member",
    description:
      "Creates a pending invitation, enforcing the organization's seat limit. Does not send email from the API — deliver the invitation through your own channel."
  })
  .input(inviteInput)
  .output(invitationOutput)
  .handler(async ({ input, context }) => {
    await requirePermission(context, PERMISSIONS.membersInvite);
    const tenantId = getTenantId(context);

    // Reuse the existing seat-limit enforcer (same logic as the dashboard invite route).
    const seatCheck = await checkSeatLimit(tenantId);
    if (!seatCheck.allowed) {
      throw forbidden(
        `Seat limit reached: plan ${seatCheck.planName} allows ${seatCheck.max} members (currently ${seatCheck.current}).`
      );
    }

    // Validasi roleId ada di tabel roles sebelum membuat undangan.
    const roleRepo = await roleRepository(supabaseAdmin);
    const { data: roleRow, error: roleError } = await roleRepo
      .query()
      .select("id, name")
      .eq("id", input.roleId)
      .maybeSingle();
    if (roleError) throw dbError(roleError);
    if (!roleRow) throw badRequest("Role tidak valid.");

    const invitationRepo = await invitationRepository(supabaseAdmin);
    const { data, error } = await invitationRepo
      .query()
      .upsert(
        { tenant_id: tenantId, email: input.email, role_id: input.roleId },
        { onConflict: "tenant_id,email" }
      )
      .select("id, tenant_id, email, role_id, roles(name), created_at")
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw dbError({ message: "Invitation could not be created." });
    return {
      id: data.id,
      tenant_id: data.tenant_id,
      email: data.email,
      role_id: data.role_id ?? null,
      role_name: (data as any).roles?.name ?? null,
      created_at: data.created_at
    };
  });

export const membersRouter = { list: listMembers, invite: inviteMember };
