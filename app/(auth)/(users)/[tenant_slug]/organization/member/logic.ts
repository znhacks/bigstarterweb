"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { plans } from "@/config/billing";
import { useLocale, useTranslations } from "next-intl";
import { PERMISSIONS, hasPermission, canAssignRole, type PermissionName } from "@/lib/rbac";

export interface Role {
  id: string;
  name: string;
  hierarchy_level: number;
}

export interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string;
  roleHierarchy: number;
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

export function useOrganizationMembers() {
  const locale = useLocale();
  const t = useTranslations("organization.organization-member");

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("Our Organization");

  // State anggota aktif & pending
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // State Batas Maksimal Pengguna berdasarkan Paket Berlangganan
  const [maxUsers, setMaxUsers] = useState<number>(2); // Default limit untuk Free Plan = 2

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState<string>("");

  // RBAC: daftar role global + otoritas pengguna saat ini di org ini
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentUserHierarchy, setCurrentUserHierarchy] = useState<number | null>(null);
  const [userPermissions, setUserPermissions] = useState<PermissionName[] | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  useEffect(() => {
    const orgId = localStorage.getItem("active_org_id");
    if (orgId) {
      setActiveOrgId(orgId);
      fetchOrgDetails(orgId);
      loadAllData(orgId);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const fetchOrgDetails = async (orgId: string) => {
    const { data } = await supabase.from("tenants").select("name").eq("id", orgId).single();
    if (data) setOrgName(data.name);
  };

  const loadAllData = async (orgId: string) => {
    setIsLoading(true);
    await Promise.all([
      fetchRoles(),
      fetchCurrentUserAuthority(orgId),
      fetchMembers(orgId),
      fetchPendingInvites(orgId),
      fetchMaxUsersLimit(orgId)
    ]);
    setIsLoading(false);
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from("roles")
      .select("id, name, hierarchy_level")
      .order("hierarchy_level", { ascending: false });
    if (error) {
      console.error("Gagal memuat daftar role:", error);
      return;
    }
    setRoles(data || []);
    if (data && data.length > 0 && !inviteRoleId) {
      const lowest = [...data].sort((a, b) => a.hierarchy_level - b.hierarchy_level)[0];
      setInviteRoleId(lowest.id);
    }
  };

  const fetchCurrentUserAuthority = async (orgId: string) => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("memberships")
      .select("roles(name, hierarchy_level, role_permissions(permissions(name)))")
      .eq("tenant_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();

    const d = data as any;
    if (error || !d?.roles) {
      setCurrentUserHierarchy(null);
      setUserPermissions(null);
      return;
    }
    setCurrentUserHierarchy(d.roles.hierarchy_level ?? null);
    const perms = (d.roles.role_permissions ?? [])
      .map((rp: any) => rp.permissions?.name)
      .filter((n: any): n is string => typeof n === "string") as PermissionName[];
    setUserPermissions(perms);
  };

  const fetchMembers = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("memberships")
        .select(
          `
          id,
          user_id,
          role_id,
          roles (
            id,
            name,
            hierarchy_level
          ),
          profiles (
            id,
            full_name
          )
        `
        )
        .eq("tenant_id", orgId);

      if (error) throw error;

      const formattedMembers: Member[] = (data || []).map((item: any) => {
        const fullName = item.profiles?.full_name || "Unknown User";
        return {
          id: item.id,
          userId: item.user_id,
          name: fullName,
          email: `${fullName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
          roleId: item.role_id ?? null,
          roleName: item.roles?.name ?? "Member",
          roleHierarchy: item.roles?.hierarchy_level ?? 0
        };
      });

      setMembers(formattedMembers);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPendingInvites = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("invitations")
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
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_id, status, ends_at")
        .eq("tenant_id", orgId)
        .maybeSingle();

      if (error) throw error;

      const endsAt = data?.ends_at ? new Date(data.ends_at) : null;
      const isExpired = endsAt ? new Date() > endsAt : false;

      const activePlanId = data && data.status === "active" && !isExpired ? data.plan_id : "free";
      const planConfig = plans.find((p) => p.id === activePlanId);

      if (planConfig) {
        setMaxUsers(planConfig.maxUsers);
      } else {
        setMaxUsers(2);
      }
    } catch (error: any) {
      console.error("Gagal memuat limit maksimal paket secara mendetail:", error?.message || error);
      setMaxUsers(2);
    }
  };

  const handleRoleChange = async (membershipId: string, newRoleId: string) => {
    const newRole = roles.find((r) => r.id === newRoleId);
    if (!newRole) return;
    try {
      const { error } = await supabase
        .from("memberships")
        .update({ role_id: newRoleId })
        .eq("id", membershipId);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) =>
          m.id === membershipId
            ? {
                ...m,
                roleId: newRoleId,
                roleName: newRole.name,
                roleHierarchy: newRole.hierarchy_level
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
    if (!memberToDelete) return;

    try {
      const { error } = await supabase.from("memberships").delete().eq("id", memberToDelete.id);

      if (error) throw error;

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
    try {
      const { error } = await supabase.from("invitations").delete().eq("id", inviteId);
      if (error) throw error;

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
  const assignableRoles = roles.filter((r) =>
    canAssignRole(currentUserHierarchy, r.hierarchy_level)
  );

  const canManageMember = (m: Member) =>
    canManage && canAssignRole(currentUserHierarchy, m.roleHierarchy);

  return {
    locale,
    t,
    activeOrgId,
    orgName,
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
    canManageMember
  };
}
