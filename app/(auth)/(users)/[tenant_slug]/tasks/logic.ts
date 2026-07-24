"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLocale, useTranslations } from "next-intl";
import { PERMISSIONS, hasPermission, type PermissionName } from "@/lib/rbac";
import type { Task, MemberOption, AlertState, TaskInput } from "./types";
import { compareStrings } from "@/lib/i18n/collator";
import { fetchTasksAction, createTaskAction, updateTaskAction, deleteTaskAction } from "./actions";
import { useFeatureGate } from "@/hooks/use-feature-gate";
import type { FeatureGates } from "@/config/feature-definitions";
import { profileRepository } from "@/supabase/repositories/profiles";
import { membershipRepository } from "@/supabase/repositories/memberships";

interface UseTasksArgs {
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
}

interface Props {
  featureGates: FeatureGates; // Ter-decode di server (getTenantPlan), diteruskan ke client
  planName?: string | Record<string, string>;
}

export function useTasks(
  { tenantSlug, tenantId, tenantName }: UseTasksArgs,
  { featureGates, planName }: Props
) {
  const locale = useLocale();
  const t = useTranslations("tasks");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<PermissionName[] | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Localize planName if it is passed as a multilingual object
  const resolvedPlanName =
    typeof planName === "object" && planName !== null
      ? planName[locale] || planName["en"] || Object.values(planName)[0] || ""
      : planName || "";

  // Pass the resolved string to useFeatureGate to resolve the TS2322 type error
  const { canUse, getLimit } = useFeatureGate({ featureGates, planName: resolvedPlanName });

  const currentUsageCount = tasks.length;

  const limit = getLimit("maxTasks" as any) || 0;
  const isLimitReached = currentUsageCount >= limit;

  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(null);
  const [timeZone, setTimeZone] = useState("UTC");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (resolved) setTimeZone(resolved);
      } catch (e) {
        console.warn("Gagal mendapatkan zona waktu sistem, pakai UTC.", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!alertMessage) return;
    const timer = setTimeout(() => setAlertMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [alertMessage]);

  const fetchTasks = useCallback(async () => {
    const res = await fetchTasksAction(tenantSlug);
    if (res.error || !res.data) {
      console.error("Gagal memuat tasks:", res.error);
      setTasks([]);
      return;
    }
    setTasks(res.data);
  }, [tenantSlug]);

  const fetchMembers = useCallback(async () => {
    const { data, error } = await (
      await membershipRepository(supabase)
    )
      .query()
      .select("user_id, profiles(full_name)")
      .eq("tenant_id", tenantId);
    if (error) {
      console.error("Gagal memuat members:", error);
      return;
    }
    const mapped: MemberOption[] = (data || [])
      .map((item: any) => ({
        id: item.user_id as string,
        name: item.profiles?.full_name || "Unknown"
      }))
      .filter((m) => !!m.id);

    const sortedMembers = mapped.sort((a, b) => compareStrings(a.name, b.name, locale));
    setMembers(sortedMembers);
  }, [tenantId, locale]);

  const fetchCurrentUser = useCallback(async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    setCurrentUserId(session.user.id);

    const { data: profileData } = await (
      await profileRepository(supabase)
    )
      .query()
      .select("timezone, preferred_language")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileData) {
      if (profileData.timezone) setTimeZone(profileData.timezone);
      if (profileData.preferred_language) setPreferredLanguage(profileData.preferred_language);
    }

    const { data, error } = await (
      await membershipRepository(supabase)
    )
      .query()
      .select("roles(name, hierarchy_level, role_permissions(permissions(name)))")
      .eq("tenant_id", tenantId)
      .eq("user_id", session.user.id)
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
  }, [tenantId]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchTasks(), fetchMembers(), fetchCurrentUser()]);
    setIsLoading(false);
  }, [fetchTasks, fetchMembers, fetchCurrentUser]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleUpgrade = async (provider: string) => {
    setIsUpgrading(true);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Anda harus masuk terlebih dahulu");

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          planId: "pro",
          interval: "monthly",
          provider: provider,
          tenantId: tenantId,
          successUrl: `${window.location.origin}/${locale}/settings/tasks?upgrade_success=true`,
          cancelUrl: `${window.location.origin}/${locale}/settings/tasks?upgrade_canceled=true`
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal membuat sesi pembayaran");

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      console.error(err);
      setAlertMessage({
        title: "Upgrade Error",
        description: err.message || "Gagal menghubungkan ke gateway pembayaran",
        variant: "destructive"
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const createTask = async (payload: TaskInput) => {
    setIsSaving(true);
    try {
      const res = await createTaskAction(tenantSlug, payload);
      if (res.error || !res.data) throw new Error(res.error);

      setTasks((prev) => [res.data as Task, ...prev]);

      setAlertMessage({
        title: locale === "en" ? "Success" : locale === "id" ? "Sukses" : "نجاح",
        description: t("alerts.created"),
        variant: "default"
      });
    } catch (error: any) {
      console.error(error);
      setAlertMessage({
        title: "Error",
        description: error?.message || t("alerts.createFailed"),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateTask = async (id: string, patch: Partial<Task>) => {
    const prev = tasks;
    setTasks((cur) => cur.map((tk) => (tk.id === id ? { ...tk, ...patch } : tk)));

    const res = await updateTaskAction(tenantSlug, id, patch);
    if (res.error || !res.data) {
      setTasks(prev);
      setAlertMessage({
        title: "Error",
        description: res.error || t("alerts.updateFailed"),
        variant: "destructive"
      });
      return;
    }
    setTasks((cur) => cur.map((tk) => (tk.id === id ? (res.data as Task) : tk)));
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    const target = taskToDelete;
    const prev = tasks;

    setTasks((cur) => cur.filter((tk) => tk.id !== target.id));
    setTaskToDelete(null);

    const res = await deleteTaskAction(tenantSlug, target.id);
    if (res.error) {
      setTasks(prev);
      setAlertMessage({
        title: "Error",
        description: res.error || t("alerts.deleteFailed"),
        variant: "destructive"
      });
      return;
    }
    setAlertMessage({
      title: locale === "en" ? "Deleted" : locale === "id" ? "Terhapus" : "تم الحذف",
      description: t("alerts.deleted"),
      variant: "destructive"
    });
  };

  const canCreate = hasPermission(userPermissions, PERMISSIONS.tasksCreate);
  const canUpdateAll = hasPermission(userPermissions, PERMISSIONS.tasksUpdate);
  const canDelete = hasPermission(userPermissions, PERMISSIONS.tasksDelete);

  const canEditTask = useCallback(
    (task: Task) =>
      canUpdateAll || task.assignee_id === currentUserId || task.created_by === currentUserId,
    [canUpdateAll, currentUserId]
  );

  const isReadOnly = !canCreate && !canUpdateAll;

  return {
    locale,
    preferredLanguage,
    t,
    timeZone,
    tasks,
    members,
    tenantName,
    canCreate,
    canUpdateAll,
    canDelete,
    canEditTask,
    isReadOnly,
    canUse,
    getLimit,
    planName: resolvedPlanName,
    limit,
    currentUsageCount,
    isLimitReached,
    isLoading,
    isSaving,
    isUpgrading,
    alertMessage,
    setAlertMessage,
    taskToDelete,
    setTaskToDelete,
    createTask,
    updateTask,
    confirmDelete,
    handleUpgrade,
    refetch: loadAll
  };
}
