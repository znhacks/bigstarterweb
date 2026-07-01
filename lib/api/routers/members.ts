import * as z from "zod";
import { o, getTenantId } from "../context";
import { supabaseAdmin } from "../supabase-server";
import { memberSchema } from "../schemas";
import { dbError, forbidden } from "../errors";
import { checkSeatLimit } from "@/lib/billing/enforcer";

export const listMembers = o
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
    const { data, error } = await supabaseAdmin
      .from("memberships")
      .select("id, tenant_id, role, app_users(email, full_name, avatar)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    if (error) throw dbError(error);
    return (data ?? []).map((m: any) => ({
      id: m.id,
      tenant_id: m.tenant_id,
      role: m.role,
      email: m.app_users?.email ?? null,
      full_name: m.app_users?.full_name ?? null,
      avatar: m.app_users?.avatar ?? null
    }));
  });

const inviteInput = z.object({
  email: z.string().email(),
  role: z.enum(["member", "admin", "owner"]).default("member")
});

const invitationOutput = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  email: z.string(),
  role: z.string(),
  created_at: z.string().nullable()
});

export const inviteMember = o
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
    const tenantId = getTenantId(context);

    // Reuse the existing seat-limit enforcer (same logic as the dashboard invite route).
    const seatCheck = await checkSeatLimit(tenantId);
    if (!seatCheck.allowed) {
      throw forbidden(
        `Seat limit reached: plan ${seatCheck.planName} allows ${seatCheck.max} members (currently ${seatCheck.current}).`
      );
    }

    const { data, error } = await supabaseAdmin
      .from("invitations")
      .upsert({ tenant_id: tenantId, email: input.email, role: input.role }, { onConflict: "tenant_id,email" })
      .select("id, tenant_id, email, role, created_at")
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw dbError({ message: "Invitation could not be created." });
    return data;
  });

export const membersRouter = { list: listMembers, invite: inviteMember };
