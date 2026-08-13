// ./app/(auth)/(users)/[tenant_slug]/organization/member/logic.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLocale, useTranslations } from "next-intl";
import { PERMISSIONS, hasPermission, canAssignRole, type PermissionName } from "@/modules/rbac/shared";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { roleRepository } from "@/supabase/repositories/roles";
import { invitationRepository } from "@/supabase/repositories/invitations";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { changeMemberRoleAction, removeMemberAction, cancelInvitationAction } from "./actions";

import { useParams } from "next/navigation";

export interface Role {
  id: string;
  name: string;
  hierarchy_level: number;
  permissions: PermissionName[];
}

export interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null; // Menyimpan data dari kolom 'avatar' di database
  roleId: string | null;
  roleName: string;
  rolePermissions: PermissionName[];
}

export interface PendingInvite {
  id: string;
  email: string;
  roleId: string | null;
  roleName: string;
  created_at: string;
}

export interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

const PAGE_SIZE = 5;

export function useOrganizationMembers() {
  const locale = useLocale();
  const t = useTranslations("organization.organization-member");

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("Our Organization");

  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [maxUsers, setMaxUsers] = useState<number>(2);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState<string>("");

  const [roles, setRoles] = useState<Role[]>([]);
  const [userPermissions, setUserPermissions] = useState<PermissionName[] | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  const params = useParams();
  const tenantSlug = (params as any)?.tenant_slug as string | undefined;

  useEffect(() => {
    async function resolveAndLoad() {
      setIsLoading(true);
      const queryKey = tenantSlug || localStorage.getItem("active_org_id") || "";
      if (queryKey) {
        try {
          const { getOrganizationDetailsAction } = await import("../general/actions");
          const res = await getOrganizationDetailsAction(queryKey);
          if (res.tenant?.id) {
            const orgId = res.tenant.id;
            setActiveOrgId(orgId);
            setOrgName(res.tenant.name || "");
            if (res.tenant.slug) setOrgSlug(res.tenant.slug);
            localStorage.setItem("active_org_id", orgId);
            document.cookie = `active_tenant_id=${orgId}; path=/; max-age=2592000; SameSite=Lax;`;
            await loadAllData(orgId);
          } else {
            setIsLoading(false);
          }
        } catch (e) {
          console.error("Gagal memuat detail organisasi member:", e);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
    resolveAndLoad();
  }, [tenantSlug]);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const [orgSlug, setOrgSlug] = useState<string>("");

  const fetchOrgDetails = async (orgId: string) => {
    const { data } = await (await tenantRepository(supabase)).query().select("name, slug").eq("id", orgId).single();
    if (data) {
      setOrgName(data.name);
      if (data.slug) setOrgSlug(data.slug);
    }
  };

  const loadAllData = async (orgId: string) => {
    setIsLoading(true);
    setMembers([]);
    setPage(0);
    setHasMore(true);
    await Promise.all([
      fetchRoles(),
      fetchCurrentUserAuthority(orgId),
      fetchPendingInvites(orgId),
      fetchMaxUsersLimit(orgId),
      fetchMembersPage(orgId, 0, "", true)
    ]);
    setIsLoading(false);
  };

  const fetchRoles = async () => {
    const { data, error } = await (await roleRepository(supabase))
      .query()
      .select("id, name, hierarchy_level, role_permissions(permissions(name))")
      .order("hierarchy_level", { ascending: false });
    if (error) {
      console.error("Gagal memuat daftar role:", error);
      return;
    }

    const formattedRoles: Role[] = (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      hierarchy_level: item.hierarchy_level ?? 0,
      permissions: ((item.role_permissions as any[]) ?? [])
        .map((rp: any) => rp?.permissions?.name)
        .filter((name: any): name is string => typeof name === "string") as PermissionName[]
    }));

    setRoles(formattedRoles);
    if (formattedRoles.length > 0 && !inviteRoleId) {
      const lowest = [...formattedRoles].sort((a, b) => a.hierarchy_level - b.hierarchy_level)[0];
      setInviteRoleId(lowest.id);
    }
  };

  const fetchCurrentUserAuthority = async (orgId: string) => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await (await membershipRepository(supabase))
      .query()
      .select("roles(name, role_permissions(permissions(name)))")
      .eq("tenant_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();

    const d = data as any;
    if (error || !d?.roles) {
      setUserPermissions(null);
      return;
    }
    const perms = (d.roles.role_permissions ?? [])
      .map((rp: any) => rp.permissions?.name)
      .filter((n: any): n is string => typeof n === "string") as PermissionName[];
    setUserPermissions(perms);
  };

  const fetchMembersPage = async (
    orgId: string,
    pageNum: number,
    searchVal: string,
    replace: boolean
  ) => {
    try {
      setIsFetchingMore(true);

      const { getOrganizationMembersAction } = await import("./actions");
      const { members: serverMembers } = await getOrganizationMembersAction(orgId);

      let filtered = serverMembers as Member[];
      if (searchVal.trim()) {
        const q = searchVal.trim().toLowerCase();
        filtered = filtered.filter(
          (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
        );
      }

      setMembers(filtered);
      setHasMore(false);
    } catch (error) {
      console.error("Gagal memuat halaman anggota:", error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeOrgId) return;

    setPage(0);
    setAppliedSearch(searchQuery);
    setIsLoading(true);
    await fetchMembersPage(activeOrgId, 0, searchQuery, true);
    setIsLoading(false);
  };

  const handleLoadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore || !activeOrgId) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchMembersPage(activeOrgId, nextPage, appliedSearch, false);
  }, [isFetchingMore, hasMore, activeOrgId, page, appliedSearch]);

  const fetchPendingInvites = async (orgId: string) => {
    try {
      const { data, error } = await (await invitationRepository(supabase))
        .query()
        .select("id, email, role_id, roles(name), created_at")
        .eq("tenant_id", orgId);

      if (error) throw error;
      const formatted: PendingInvite[] = (data || []).map((item: any) => ({
        id: item.id,
        email: item.email,
        roleId: item.role_id ?? null,
        roleName: item.roles?.name ?? "Member",
        created_at: item.created_at
      }));
      setPendingInvites(formatted);
    } catch (error) {
      console.error("Gagal memuat daftar pending:", error);
    }
  };

  const fetchMaxUsersLimit = async (orgId: string) => {
    try {
      // Import config untuk mendapatkan limit anggota free plan
      const { tenantConfig } = await import("@/config/tenant");
      const configLimit = tenantConfig.organizations.freeMemberLimit;

      // Coba ambil dari paket aktif jika billing diaktifkan
      const [subResult, plansRes] = await Promise.all([
        (await subscriptionRepository(supabase))
          .query()
          .select("plan_id, status, ends_at")
          .eq("tenant_id", orgId)
          .maybeSingle(),
        fetch("/api/billing/plans").then((r) => r.json()).catch(() => ({}))
      ]);

      const { data, error } = subResult;
      if (error) throw error;

      const endsAt = data?.ends_at ? new Date(data.ends_at) : null;
      const isExpired = endsAt ? new Date() > endsAt : false;

      const activePlanId = data && data.status === "active" && !isExpired ? data.plan_id : "free";
      const planList = (plansRes?.plans as any[]) || [];
      const activePlan = planList.find((p) => p.id === activePlanId);

      // Prioritas: featureGates dari plan DB → freeMemberLimit dari config → 3
      setMaxUsers(activePlan?.featureGates?.maxUsers ?? configLimit ?? 3);
    } catch (error: any) {
      console.error("Gagal memuat limit maksimal paket:", error?.message || error);
      // Fallback ke nilai dari config tenant
      try {
        const { tenantConfig } = await import("@/config/tenant");
        setMaxUsers(tenantConfig.organizations.freeMemberLimit ?? 3);
      } catch {
        setMaxUsers(3);
      }
    }
  };

  const handleRoleChange = async (membershipId: string, newRoleId: string) => {
    if (!activeOrgId) return;
    const newRole = roles.find((r) => r.id === newRoleId);
    if (!newRole) return;
    try {
      const res = await changeMemberRoleAction(activeOrgId, membershipId, newRoleId);
      if (res.error) throw new Error(res.error);

      setMembers((prev) =>
        prev.map((m) =>
          m.id === membershipId
            ? {
                ...m,
                roleId: newRoleId,
                roleName: newRole.name,
                rolePermissions: newRole.permissions
              }
            : m
        )
      );

      setAlertMessage({
        title: locale === "en" ? "Success" : "Sukses",
        description: t("alerts.roleUpdated"),
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!activeOrgId || !memberToDelete) return;

    try {
      const res = await removeMemberAction(activeOrgId, memberToDelete.id);
      if (res.error) throw new Error(res.error);

      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));

      setAlertMessage({
        title: locale === "en" ? "Removed" : "Terhapus",
        description: t("alerts.memberRemoved"),
        variant: "destructive"
      });
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setMemberToDelete(null);
    }
  };

  const handleCancelInvitation = async (inviteId: string, email: string) => {
    if (!activeOrgId) return;
    try {
      const res = await cancelInvitationAction(activeOrgId, inviteId);
      if (res.error) throw new Error(res.error);

      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setAlertMessage({
        title: locale === "en" ? "Cancelled" : "Dibatalkan",
        description: t("alerts.inviteCancelled"),
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message || "Gagal membatalkan undangan.",
        variant: "destructive"
      });
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeOrgId) return;

    if (members.length >= maxUsers) {
      setAlertMessage({
        title: locale === "en" ? "Limit Reached" : "Batas Kuota Tercapai",
        description: t("inviteCard.limitAlertDesc", { max: maxUsers }),
        variant: "destructive"
      });
      return;
    }

    setIsInviting(true);
    setAlertMessage(null);
    try {
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: inviteEmail,
          roleId: inviteRoleId,
          orgName: orgName
        })
      });

      if (!response.ok) throw new Error("Failed to send invitation");

      setAlertMessage({
        title: locale === "en" ? "Invitation Sent" : "Undangan Dikirim",
        description: t("alerts.inviteSent", { email: inviteEmail }),
        variant: "default"
      });

      setInviteEmail("");
      await fetchPendingInvites(activeOrgId);
    } catch (error: any) {
      setAlertMessage({
        title: "Error Sending Email",
        description: t("alerts.errorInvite"),
        variant: "destructive"
      });
    } finally {
      setIsInviting(false);
    }
  };

  const isLimitReached = members.length >= maxUsers;

  const canInvite = hasPermission(userPermissions, PERMISSIONS.membersInvite);
  const canManage = hasPermission(userPermissions, PERMISSIONS.membersManage);
  const canRemove = hasPermission(userPermissions, PERMISSIONS.membersRemove);
  const assignableRoles = roles.filter((r) => canAssignRole(userPermissions, r.permissions));

  const canManageMember = (m: Member) => canManage && canAssignRole(userPermissions, m.rolePermissions);

  return {
    locale,
    t,
    activeOrgId,
    orgName,
    orgSlug,
    members,
    pendingInvites,
    maxUsers,
    inviteEmail,
    setInviteEmail,
    inviteRoleId,
    setInviteRoleId,
    isLoading,
    isInviting,
    alertMessage,
    setAlertMessage,
    memberToDelete,
    setMemberToDelete,
    handleRoleChange,
    handleConfirmRemoveMember,
    handleCancelInvitation,
    handleInviteSubmit,
    isLimitReached,
    canInvite,
    canRemove,
    assignableRoles,
    canManageMember,
    searchQuery,
    setSearchQuery,
    handleSearchSubmit,
    handleLoadMore,
    hasMore,
    isFetchingMore
  };
}
