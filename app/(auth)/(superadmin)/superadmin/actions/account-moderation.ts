"use server";

import { requireSuperadmin, requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { createClient } from "@/lib/supabase/server";
import { computeBannedUntil } from "@/config/moderation";

export interface DeletedUserRow {
  id: string;
  full_name: string | null;
  deleted_at: string | null;
}
export interface DeletedTenantRow {
  id: string;
  name: string;
  deleted_at: string | null;
}
export interface ActionResult<T = unknown> {
  success?: true;
  data?: T;
  error?: string;
}

const nowIso = () => new Date().toISOString();

// ============ SUPERADMIN: soft-delete / restore ============

export async function softDeleteUser(userId: string): Promise<ActionResult> {
  await requireSuperadmin();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ status: "deleted", deleted_at: nowIso(), banned_until: null, banned_reason: null })
    .eq("id", userId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function softDeleteTenant(tenantId: string): Promise<ActionResult> {
  await requireSuperadmin();
  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ status: "deleted", deleted_at: nowIso() })
    .eq("id", tenantId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function restoreUser(userId: string): Promise<ActionResult> {
  await requireSuperadmin();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ status: "active", deleted_at: null })
    .eq("id", userId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function restoreTenant(tenantId: string): Promise<ActionResult> {
  await requireSuperadmin();
  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ status: "active", deleted_at: null })
    .eq("id", tenantId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function listDeletedUsers(): Promise<ActionResult<DeletedUserRow[]>> {
  await requireSuperadmin();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, deleted_at")
    .eq("status", "deleted")
    .order("deleted_at", { ascending: false });
  if (error) return { error: error.message };
  return { success: true, data: (data || []) as DeletedUserRow[] };
}

export async function listDeletedTenants(): Promise<ActionResult<DeletedTenantRow[]>> {
  await requireSuperadmin();
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, deleted_at")
    .eq("status", "deleted")
    .order("deleted_at", { ascending: false });
  if (error) return { error: error.message };
  return { success: true, data: (data || []) as DeletedTenantRow[] };
}

// ============ SUPERADMIN: ban / unban (akun user saja) ============

export async function banUser(args: {
  userId: string;
  durationKey: string;
  reason?: string;
}): Promise<ActionResult> {
  await requireSuperadmin();
  const bannedUntil = computeBannedUntil(args.durationKey);
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      status: "banned",
      banned_until: bannedUntil,
      banned_reason: args.reason?.trim() || null,
      deleted_at: null
    })
    .eq("id", args.userId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function unbanUser(userId: string): Promise<ActionResult> {
  await requireSuperadmin();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ status: "active", banned_until: null, banned_reason: null })
    .eq("id", userId);
  if (error) return { error: error.message };
  return { success: true };
}

// ============ SELF-SERVICE: restore akun sendiri (dari halaman /restore) ============

/**
 * Memulihkan akun sendiri. Dipanggil dari /restore setelah user (yg
 * status='deleted') berhasil login. Pakai client user-session sehingga
 * RLS UPDATE (id = auth.uid()) berlaku — user hanya bisa pulihkan akunnya
 * sendiri. Tidak butuh superadmin.
 */
export async function restoreOwnAccount(): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status: "active", deleted_at: null })
    .eq("id", user.id);
  if (error) return { error: error.message };
  return { success: true };
}
