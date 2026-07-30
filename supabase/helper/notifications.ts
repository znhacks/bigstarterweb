// supabase/helper/notifications.ts
//
// Helper isomorphic untuk tabel `notifications` & `notification_preferences`
// (schema public). Sama seperti helper lain: server WAJIB meneruskan client
// eksplisit (createClient()/supabaseAdmin); di browser otomatis pakai `supabase`.

import { getClient, type AnySupabaseClient } from "./client";
import { notificationRepository } from "@/supabase/repositories/notifications";
import { notificationPreferenceRepository } from "@/supabase/repositories/notification-preferences";

export interface NotificationListOptions {
  unreadOnly?: boolean;
  limit?: number;
}

/** Daftar notifikasi inbox seorang user (terbaru di atas). */
export async function getNotifications(
  userId: string,
  opts: NotificationListOptions = {},
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await notificationRepository(supabase);
  let q = repo.query().select(select as "*").eq("user_id", userId);
  if (opts.unreadOnly) q = q.eq("is_read", false);
  q = q.order("created_at", { ascending: false });
  if (opts.limit) q = q.limit(opts.limit);
  return q;
}

/** Jumlah notifikasi belum dibuat (count). */
export async function getUnreadCount(
  userId: string,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await notificationRepository(supabase);
  return repo
    .query()
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}

/** Tandai satu notifikasi sudah dibaca. */
export async function markNotificationRead(
  id: string,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await notificationRepository(supabase);
  return repo
    .query()
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);
}

/** Tandai semua notifikasi user sudah dibaca. */
export async function markAllNotificationsRead(
  userId: string,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await notificationRepository(supabase);
  return repo
    .query()
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);
}

/** Hapus satu notifikasi. */
export async function deleteNotification(
  id: string,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await notificationRepository(supabase);
  return repo.query().delete().eq("id", id);
}

/** Ambil preferensi notifikasi user (null bila belum ada row). */
export async function getNotificationPreferences(
  userId: string,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await notificationPreferenceRepository(supabase);
  return repo
    .query()
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();
}

/** Upsert preferensi notifikasi user (idempoten per user_id). */
export async function upsertNotificationPreferences(
  userId: string,
  preferences: Record<string, any>,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await notificationPreferenceRepository(supabase);
  return repo.upsert({
    user_id: userId,
    preferences,
    updated_at: new Date().toISOString()
  });
}
