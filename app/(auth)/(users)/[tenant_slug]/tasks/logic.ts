"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLocale, useTranslations } from "next-intl";
import { PERMISSIONS, hasPermission, type PermissionName } from "@/lib/rbac";
import type { Task, MemberOption, AlertState, TaskInput } from "./types";
import {
  fetchTasksAction,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction
} from "./actions";

interface UseTasksArgs {
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
}

export function useTasks({ tenantSlug, tenantId, tenantName }: UseTasksArgs) {
  const locale = useLocale();
  const t = useTranslations("tasks");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<PermissionName[] | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Timezone pengguna (client-side, sama pola dgn superadmin/users).
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

  // Auto-dismiss alert setelah 5 detik.
  useEffect(() => {
    if (!alertMessage) return;
    const timer = setTimeout(() => setAlertMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [alertMessage]);

  // ---------- Tasks (via server action; data ada di schema tenant_shared) ----------
  const fetchTasks = useCallback(async () => {
    const res = await fetchTasksAction(tenantSlug);
    if (res.error || !res.data) {
      console.error("Gagal memuat tasks:", res.error);
      setTasks([]);
      return;
    }
    setTasks(res.data);
  }, [tenantSlug]);

  // ---------- Members (public schema, via browser supabase) ----------
  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from("memberships")
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
    setMembers(mapped);
  }, [tenantId]);

  // ---------- Authority user (public schema) ----------
  const fetchCurrentUser = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from("memberships")
      .select("roles(name, hierarchy_level, role_permissions(permissions(name)))")
      .eq("tenant_id", tenantId)
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
  }, [tenantId]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchTasks(), fetchMembers(), fetchCurrentUser()]);
    setIsLoading(false);
  }, [fetchTasks, fetchMembers, fetchCurrentUser]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ---------- CRUD ----------
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
    // Optimistic: update state lokal dulu, rollback bila gagal.
    const prev = tasks;
    setTasks((cur) => cur.map((tk) => (tk.id === id ? { ...tk, ...patch } : tk)));

    const res = await updateTaskAction(tenantSlug, id, patch);
    if (res.error || !res.data) {
      setTasks(prev); // rollback
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
      setTasks(prev); // rollback
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

  // ---------- Derived authority ----------
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
    // i18n / locale
    locale,
    t,
    timeZone,
    // data
    tasks,
    members,
    tenantName,
    // authority
    canCreate,
    canUpdateAll,
    canDelete,
    canEditTask,
    isReadOnly,
    // ui state
    isLoading,
    isSaving,
    alertMessage,
    setAlertMessage,
    taskToDelete,
    setTaskToDelete,
    // actions
    createTask,
    updateTask,
    confirmDelete,
    refetch: loadAll
  };
}

// Re-export tipe agar pemakaian lama (mis. data-table) tetap kompatibel.
export type { Task, MemberOption, TaskProfile, TaskStatus, TaskPriority } from "./types";
