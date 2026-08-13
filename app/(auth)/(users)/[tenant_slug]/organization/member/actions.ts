"use server";

// Server action mutasi memberships/invitations (schema public) dgn cek permission
// + hierarchy (canAssignRole). Pakai createClient() (server user client, RLS).

import { createClient } from "@/lib/supabase/server";
import { resolveTenantAuthorityFull } from "@/lib/billing/tenant-auth";
import { PERMISSIONS } from "@/modules/rbac/shared";
import { hasPermission, canAssignRole } from "@/modules/rbac/shared";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { roleRepository } from "@/supabase/repositories/roles";
import { invitationRepository } from "@/supabase/repositories/invitations";

type Result = { error?: string };

async function resolveAuthority(tenantId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { supabase, authority: null as null | Awaited<ReturnType<typeof resolveTenantAuthorityFull>> };
  const authority = await resolveTenantAuthorityFull(supabase, user.id, tenantId);
  return { supabase, authority };
}

/** Ubah role seorang member. Wajib members.manage dan role target
 * harus memiliki permission yang seluruhnya ada pada actor. */
export async function changeMemberRoleAction(
  tenantId: string,
  membershipId: string,
  newRoleId: string
): Promise<Result> {
  try {
    const { supabase, authority } = await resolveAuthority(tenantId);
    if (!supabase || !authority) return { error: "Tidak terautentikasi." };
    if (!hasPermission(authority.permissions, PERMISSIONS.membersManage)) {
      return { error: "Akses ditolak: butuh permission members.manage." };
    }

    const { data: role } = await (await roleRepository(supabase))
      .query()
      .select("id, role_permissions(permissions(name))")
      .eq("id", newRoleId)
      .maybeSingle();
    if (!role) return { error: "Role tidak valid." };

    const targetPermissions = ((role as any).role_permissions ?? [])
      .map((rp: any) => rp?.permissions?.name)
      .filter((name: any): name is string => typeof name === "string");

    if (!canAssignRole(authority.permissions, targetPermissions)) {
      return { error: "Tidak boleh menetapkan role yang memerlukan permission di luar otoritas Anda." };
    }

    const { error } = await (await membershipRepository(supabase))
      .query()
      .update({ role_id: newRoleId })
      .eq("id", membershipId);
    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    return { error: e?.message || "Gagal mengubah role." };
  }
}

/** Hapus member. Wajib members.remove. */
export async function removeMemberAction(
  tenantId: string,
  membershipId: string
): Promise<Result> {
  try {
    const { supabase, authority } = await resolveAuthority(tenantId);
    if (!supabase || !authority) return { error: "Tidak terautentikasi." };
    if (!hasPermission(authority.permissions, PERMISSIONS.membersRemove)) {
      return { error: "Akses ditolak: butuh permission members.remove." };
    }

    const { error } = await (await membershipRepository(supabase))
      .query()
      .delete()
      .eq("id", membershipId);
    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    return { error: e?.message || "Gagal menghapus anggota." };
  }
}

/** Batalkan undangan. Wajib members.invite. */
export async function cancelInvitationAction(
  tenantId: string,
  inviteId: string
): Promise<Result> {
  try {
    const { supabase, authority } = await resolveAuthority(tenantId);
    if (!supabase || !authority) return { error: "Tidak terautentikasi." };
    if (!hasPermission(authority.permissions, PERMISSIONS.membersInvite)) {
      return { error: "Akses ditolak: butuh permission members.invite." };
    }

    const { error } = await (await invitationRepository(supabase))
      .query()
      .delete()
      .eq("id", inviteId);
    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    return { error: e?.message || "Gagal membatalkan undangan." };
  }
}

/** Fetch organization members safely bypassing browser RLS issues */
export async function getOrganizationMembersAction(tenantId: string) {
  try {
    const { supabaseAdmin } = await import("@/lib/api/supabase-server");

    const { data: rawMemberships, error } = await supabaseAdmin
      .from("memberships")
      .select("id, user_id, created_at, role_id, roles(id, name, hierarchy_level, role_permissions(permissions(name)))")
      .eq("tenant_id", tenantId);

    if (error || !rawMemberships) return { members: [] };

    const userIds = rawMemberships.map((m: any) => m.user_id).filter(Boolean);

    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar")
      .in("id", userIds);

    const profMap = new Map((profs || []).map((p: any) => [p.id, p]));

    let authUserMap = new Map<string, any>();
    try {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      if (authUsers?.users) {
        authUserMap = new Map(authUsers.users.map((u) => [u.id, u]));
      }
    } catch (authErr) {
      console.warn("Notice fetching auth users:", authErr);
    }

    const members = rawMemberships.map((m: any) => {
      const prof = profMap.get(m.user_id);
      const authUser = authUserMap.get(m.user_id);
      const fullName =
        prof?.full_name ||
        authUser?.user_metadata?.full_name ||
        authUser?.user_metadata?.name ||
        (authUser?.email ? authUser.email.split("@")[0] : "Workspace Member");
      const email = prof?.email || authUser?.email || "";

      const permissions = ((m.roles?.role_permissions as any[]) ?? [])
        .map((rp: any) => rp?.permissions?.name)
        .filter((name: any): name is string => typeof name === "string");

      return {
        id: m.id,
        userId: m.user_id,
        name: fullName,
        email,
        avatarUrl: prof?.avatar || null,
        roleId: m.role_id,
        roleName: m.roles?.name || "Member",
        rolePermissions: permissions
      };
    });

    return { members };
  } catch (err) {
    console.error("Error pada getOrganizationMembersAction:", err);
    return { members: [] };
  }
}
