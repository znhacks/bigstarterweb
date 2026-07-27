import * as z from "zod";
import { getTenantId, requirePermission } from "../context";
import { protectedProcedure, sessionProcedure } from "../procedures";
import { supabaseAdmin } from "../supabase-server";
import { taskRepository } from "@/supabase/repositories/tasks";
import { taskSchema, uuid, pagination, paginated } from "../schemas";
import { notFound, dbError } from "../errors";
import { PERMISSIONS } from "@/lib/rbac";

export const listTasks = protectedProcedure
  .route({
    method: "GET",
    path: "/tasks",
    tags: ["Tasks"],
    summary: "List tasks",
    description: "Tenant-scoped, paginated. Requires an API key."
  })
  .input(pagination)
  .output(paginated(taskSchema))
  .handler(async ({ input, context }) => {
    const tenantId = getTenantId(context);
    const taskRepo = await taskRepository(supabaseAdmin);
    const { data, count, error } = await taskRepo
      .query()
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);
    if (error) throw dbError(error);
    return {
      data: data ?? [],
      total: count ?? 0,
      hasMore: input.offset + input.limit < (count ?? 0)
    };
  });

export const createTask = sessionProcedure
  .route({
    method: "POST",
    path: "/tasks",
    tags: ["Tasks"],
    summary: "Create a task"
  })
  .input(z.object({ title: z.string().min(1).max(255) }))
  .output(taskSchema)
  .handler(async ({ input, context }) => {
    await requirePermission(context, PERMISSIONS.tasksCreate);
    const tenantId = getTenantId(context);
    const taskRepo = await taskRepository(supabaseAdmin);
    const { data, error } = await taskRepo
      .query()
      .insert({ tenant_id: tenantId, title: input.title })
      .select("*")
      .single();
    if (error) throw dbError(error);
    return data;
  });

export const getTask = protectedProcedure
  .route({ method: "GET", path: "/tasks/{id}", tags: ["Tasks"], summary: "Get a task" })
  .input(z.object({ id: uuid }))
  .output(taskSchema)
  .handler(async ({ input, context }) => {
    const tenantId = getTenantId(context);
    const taskRepo = await taskRepository(supabaseAdmin);
    const { data, error } = await taskRepo
      .query()
      .select("*")
      .eq("id", input.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound("Task not found in your tenant.");
    return data;
  });

export const updateTask = sessionProcedure
  .route({ method: "PATCH", path: "/tasks/{id}", tags: ["Tasks"], summary: "Update a task" })
  .input(z.object({ id: uuid, title: z.string().min(1).max(255).optional() }))
  .output(taskSchema)
  .handler(async ({ input, context }) => {
    await requirePermission(context, PERMISSIONS.tasksUpdate);
    const tenantId = getTenantId(context);
    const taskRepo = await taskRepository(supabaseAdmin);
    const { data, error } = await taskRepo
      .query()
      .update({ ...(input.title !== undefined ? { title: input.title } : {}) })
      .eq("id", input.id)
      .eq("tenant_id", tenantId)
      .select("*")
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound("Task not found in your tenant.");
    return data;
  });

export const removeTask = sessionProcedure
  .route({ method: "DELETE", path: "/tasks/{id}", tags: ["Tasks"], summary: "Delete a task" })
  .input(z.object({ id: uuid }))
  .output(z.object({ id: uuid, deleted: z.literal(true) }))
  .handler(async ({ input, context }) => {
    await requirePermission(context, PERMISSIONS.tasksDelete);
    const tenantId = getTenantId(context);
    const taskRepo = await taskRepository(supabaseAdmin);
    const { error, count } = await taskRepo
      .query()
      .delete({ count: "exact" })
      .eq("id", input.id)
      .eq("tenant_id", tenantId);
    if (error) throw dbError(error);
    if (!count) throw notFound("Task not found in your tenant.");
    return { id: input.id, deleted: true as const };
  });

export const tasksRouter = {
  list: listTasks,
  create: createTask,
  get: getTask,
  update: updateTask,
  remove: removeTask
};
