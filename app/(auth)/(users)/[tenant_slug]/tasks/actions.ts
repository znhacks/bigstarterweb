"use server";

import { requireAuth } from "@/lib/auth";
import { getActiveTenant } from "@/services/tenant";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { createTenantServerClient } from "@/lib/supabase/tenant-server";
import { getProfilesByIds } from "@/supabase/helper/profiles";
import { getTask, getTasksByTenant } from "@/supabase/helper/tasks";
import { profileRepository } from "@/supabase/repositories/profiles";
import { taskRepository } from "@/supabase/repositories/tasks";
import type { Task, TaskInput, TaskProfile, ActionResult } from "./types";

async function fetchProfilesMap(ids: string[]): Promise<Map<string, TaskProfile>> {
  const map = new Map<string, TaskProfile>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return map;
  const pub = await createClient();
  const { data } = await (
    await profileRepository(pub)
  )
    .query()
    .select("id, full_name, avatar")
    .in("id", unique);
  (data || []).forEach((p: any) =>
    map.set(p.id, { id: p.id, full_name: p.full_name, avatar: p.avatar })
  );
  return map;
}

function enrichTask(task: any, profiles: Map<string, TaskProfile>): Task {
  return {
    ...(task as Task),
    assignee: task.assignee_id ? profiles.get(task.assignee_id) || null : null,
    creator: task.created_by ? profiles.get(task.created_by) || null : null
  };
}

export async function fetchTasksAction(tenantSlug: string): Promise<ActionResult<Task[]>> {
  try {
    const user = await requireAuth();
    const ctx = await getActiveTenant(tenantSlug);
    if (!ctx) return { error: "Akses ditolak" };
    if (!ctx.permissions.includes(PERMISSIONS.tasksRead)) return { error: "Akses ditolak" };

    const { client } = await createTenantServerClient(ctx.tenant.id);
    const { data, error } = await (
      await taskRepository(client)
    )
      .query()
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data || []) as any[];
    const ids = rows.flatMap((t) => [t.assignee_id, t.created_by].filter(Boolean) as string[]);
    const profiles = await fetchProfilesMap(ids);

    return { success: true, data: rows.map((t) => enrichTask(t, profiles)) };
  } catch (err: any) {
    console.error("fetchTasksAction:", err);
    return { error: err?.message || "Gagal memuat tasks" };
  }
}

export async function createTaskAction(
  tenantSlug: string,
  input: TaskInput
): Promise<ActionResult<Task>> {
  try {
    const user = await requireAuth();
    const ctx = await getActiveTenant(tenantSlug);
    if (!ctx) return { error: "Akses ditolak" };
    if (!ctx.permissions.includes(PERMISSIONS.tasksCreate)) return { error: "Akses ditolak" };

    const { client } = await createTenantServerClient(ctx.tenant.id);
    const insert: Record<string, unknown> = {
      tenant_id: ctx.tenant.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      assignee_id: input.assignee_id ?? null,
      due_date: input.due_date ?? null,
      created_by: user.id
    };

    const { data, error } = await (
      await taskRepository(client)
    )
      .query()
      .insert(insert)
      .select("*")
      .single();
    if (error) throw error;

    const profiles = await fetchProfilesMap(
      [data.assignee_id, data.created_by].filter(Boolean) as string[]
    );
    return { success: true, data: enrichTask(data, profiles) };
  } catch (err: any) {
    console.error("createTaskAction:", err);
    return { error: err?.message || "Gagal membuat task" };
  }
}

export async function updateTaskAction(
  tenantSlug: string,
  id: string,
  patch: Partial<Task>
): Promise<ActionResult<Task>> {
  try {
    const user = await requireAuth();
    const ctx = await getActiveTenant(tenantSlug);
    if (!ctx) return { error: "Akses ditolak" };

    const { client } = await createTenantServerClient(ctx.tenant.id);
    const taskRepo = await taskRepository(client);

    const canUpdateAll = ctx.permissions.includes(PERMISSIONS.tasksUpdate);
    if (!canUpdateAll) {
      const { data: existing } = await taskRepo
        .query()
        .select("assignee_id, created_by")
        .eq("id", id)
        .eq("tenant_id", ctx.tenant.id)
        .maybeSingle();
      const isOwner = existing?.assignee_id === user.id || existing?.created_by === user.id;
      if (!isOwner) return { error: "Akses ditolak" };
    }

    const cleanPatch: Record<string, unknown> = { ...patch };
    delete cleanPatch.id;
    delete cleanPatch.assignee;
    delete cleanPatch.creator;
    delete cleanPatch.tenant_id;
    delete cleanPatch.created_by;

    const { data, error } = await taskRepo
      .query()
      .update(cleanPatch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    const profiles = await fetchProfilesMap(
      [data.assignee_id, data.created_by].filter(Boolean) as string[]
    );
    return { success: true, data: enrichTask(data, profiles) };
  } catch (err: any) {
    console.error("updateTaskAction:", err);
    return { error: err?.message || "Gagal memperbarui task" };
  }
}

export async function deleteTaskAction(
  tenantSlug: string,
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
    const ctx = await getActiveTenant(tenantSlug);
    if (!ctx) return { error: "Akses ditolak" };
    if (!ctx.permissions.includes(PERMISSIONS.tasksDelete)) return { error: "Akses ditolak" };

    const { client } = await createTenantServerClient(ctx.tenant.id);
    const { error } = await (await taskRepository(client)).query().delete().eq("id", id);
    if (error) throw error;

    return { success: true, data: { id } };
  } catch (err: any) {
    console.error("deleteTaskAction:", err);
    return { error: err?.message || "Gagal menghapus task" };
  }
}
