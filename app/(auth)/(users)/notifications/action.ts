// app/(auth)/(users)/notifications/action.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  deleteNotification,
  getNotificationPreferences,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  upsertNotificationPreferences
} from "@/supabase/helper";
import { getEffectivePreferences } from "@/services/notification/preferences";
import { invalidatePreferencesCache } from "@/services/notification/preferences";

export interface InboxItem {
  id: string;
  category: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  link: string | null;
  is_read: boolean;
  source: string;
  source_ref: string | null;
  created_at: string;
}

export async function getInboxAction(
  opts: { unreadOnly?: boolean; limit?: number } = { limit: 50 }
): Promise<InboxItem[]> {
  const user = await requireAuth();
  const client = await createClient();
  const { data } = await getNotifications(user.id, opts, "*", client);
  return (data ?? []) as InboxItem[];
}

export async function getUnreadCountAction(): Promise<number> {
  const user = await requireAuth();
  const client = await createClient();
  const { count } = await getUnreadCount(user.id, client);
  return count ?? 0;
}

/** Ambil satu notifikasi (RLS: hanya milik sendiri). Untuk halaman detail. */
export async function getNotificationAction(id: string): Promise<InboxItem | null> {
  await requireAuth();
  const client = await createClient();
  const { data } = await client
    .from("notifications")
    .select(
      "id, category, title, body, data, link, is_read, source, source_ref, created_at"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as InboxItem | null) ?? null;
}

export async function markReadAction(id: string): Promise<void> {
  await requireAuth();
  const client = await createClient();
  await markNotificationRead(id, client);
  revalidatePath("/notifications");
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireAuth();
  const client = await createClient();
  await markAllNotificationsRead(user.id, client);
  revalidatePath("/notifications");
}

export async function deleteNotificationAction(id: string): Promise<void> {
  await requireAuth();
  const client = await createClient();
  await deleteNotification(id, client);
  revalidatePath("/notifications");
}

/** Preferensi efektif (config ← kategori ← user) — untuk menampilkan matriks. */
export async function getEffectivePrefsAction() {
  const user = await requireAuth();
  return getEffectivePreferences(user.id);
}

export async function getPreferencesAction() {
  const user = await requireAuth();
  const client = await createClient();
  const { data } = await getNotificationPreferences(user.id, client);
  return data?.preferences ?? null;
}

export async function savePreferencesAction(
  preferences: Record<string, Record<string, boolean>>
): Promise<void> {
  const user = await requireAuth();
  const client = await createClient();
  await upsertNotificationPreferences(user.id, preferences, client);
  invalidatePreferencesCache(user.id);
  revalidatePath("/settings/notifications");
}
