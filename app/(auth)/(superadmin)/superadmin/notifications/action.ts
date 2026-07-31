// app/(auth)/(superadmin)/superadmin/notifications/action.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { notificationCategoryRepository } from "@/supabase/repositories/notification-categories";
import { notificationTemplateRepository } from "@/supabase/repositories/notification-templates";
import { announcementRepository } from "@/supabase/repositories/announcements";
import { announcementTargetRepository } from "@/supabase/repositories/announcement-targets";
import { notificationDeliveryLogRepository } from "@/supabase/repositories/notification-delivery-logs";
import { profileRepository } from "@/supabase/repositories/profiles";
import { notificationService } from "@/services/notification/notification-service";
import { invalidatePreferencesCache } from "@/services/notification/preferences";
import type {
  ActionResult,
  SuperadminAnnouncement,
  SuperadminCategory,
  SuperadminDeliveryLog,
  SuperadminTemplate
} from "./types";

const NOTIFICATIONS_BASE = "/superadmin/notifications";

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function getNotificationCategories(): Promise<SuperadminCategory[]> {
  await requireSuperadmin();
  const repo = await notificationCategoryRepository(supabaseAdmin);
  const { data } = await repo
    .query()
    .select("*")
    .order("sort_order", { ascending: true });
  return (data ?? []).map((c) => ({
    id: c.id,
    labelKey: c.label_key,
    description: c.description,
    defaultChannels: c.default_channels ?? {},
    sortOrder: c.sort_order,
    isSystem: c.is_system
  }));
}

export async function getNotificationTemplates(): Promise<SuperadminTemplate[]> {
  await requireSuperadmin();
  const repo = await notificationTemplateRepository(supabaseAdmin);
  const { data } = await repo
    .query()
    .select("*")
    .order("category", { ascending: true });
  return (data ?? []).map((t) => ({
    id: t.id,
    category: t.category,
    title: t.title ?? {},
    body: t.body ?? {},
    channels: t.channels ?? [],
    variables: t.variables ?? null,
    link: t.link,
    isEnabled: t.is_enabled,
    isSystem: t.is_system,
    updatedAt: t.updated_at
  }));
}

export async function getAnnouncements(): Promise<SuperadminAnnouncement[]> {
  await requireSuperadmin();
  const repo = await announcementRepository(supabaseAdmin);
  const { data } = await repo
    .query()
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map((a) => ({
    id: a.id,
    title: a.title ?? {},
    body: a.body ?? {},
    audience: a.audience,
    channels: a.channels ?? [],
    status: a.status,
    scheduledFor: a.scheduled_for,
    sentAt: a.sent_at,
    createdBy: a.created_by,
    createdAt: a.created_at
  }));
}

export async function getDeliveryLogs(limit = 200): Promise<SuperadminDeliveryLog[]> {
  await requireSuperadmin();
  // Service-role (supabaseAdmin) → bypass RLS → superadmin membaca SEMUA log
  // lintas user. Email di-fetch terpisah (bukan embedded join) agar tidak gagal
  // bila schema cache belum resolve relasi.
  const repo = await notificationDeliveryLogRepository(supabaseAdmin);
  const { data, error } = await repo
    .query()
    .select(
      "id, user_id, channel, category, title, status, error, provider, source, source_ref, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data || data.length === 0) return [];

  const userIds = Array.from(
    new Set((data as any[]).map((l) => l.user_id).filter(Boolean))
  );
  const profileRepo = await profileRepository(supabaseAdmin);
  const { data: profiles } = await profileRepo
    .query()
    .select("id, email")
    .in("id", userIds);
  const emailMap = new Map((profiles ?? []).map((p: any) => [p.id, p.email]));

  return (data as any[]).map((l) => ({
    id: l.id,
    userId: l.user_id,
    userEmail: emailMap.get(l.user_id) ?? null,
    channel: l.channel,
    category: l.category,
    title: l.title,
    status: l.status,
    error: l.error,
    provider: l.provider,
    source: l.source,
    sourceRef: l.source_ref,
    createdAt: l.created_at
  }));
}

/* ------------------------------------------------------------------ */
/* Template mutations                                                  */
/* ------------------------------------------------------------------ */

export async function saveTemplate(input: {
  id: string;
  title: Record<string, string>;
  body: Record<string, string>;
  channels: string[];
  link?: string | null;
}): Promise<ActionResult> {
  await requireSuperadmin();
  if (!input.id) return { error: "ID template wajib diisi." };

  const repo = await notificationTemplateRepository(supabaseAdmin);
  const { error } = await repo.update(input.id, {
    title: input.title,
    body: input.body,
    channels: input.channels,
    link: input.link ?? null,
    updated_at: new Date().toISOString()
  });
  if (error) return { error: error.message };

  revalidatePath(`${NOTIFICATIONS_BASE}/templates`);
  return { success: true };
}

export async function toggleTemplate(
  id: string,
  enabled: boolean
): Promise<ActionResult> {
  await requireSuperadmin();
  const repo = await notificationTemplateRepository(supabaseAdmin);
  const { error } = await repo.update(id, {
    is_enabled: enabled,
    updated_at: new Date().toISOString()
  });
  if (error) return { error: error.message };
  revalidatePath(`${NOTIFICATIONS_BASE}/templates`);
  return { success: true };
}

export async function sendTestNotification(
  event: string,
  userId: string
): Promise<ActionResult> {
  await requireSuperadmin();
  if (!event || !userId) return { error: "event & userId wajib diisi." };
  const results = await notificationService.send({ event, userId, data: {} });
  const anySent = results.some((r) => r.status === "sent" || r.status === "delivered");
  revalidatePath(`${NOTIFICATIONS_BASE}/delivery-logs`);
  if (!anySent) {
    return { error: `Tidak ada channel aktif. Hasil: ${results.map((r) => `${r.channel}:${r.status}`).join(", ")}` };
  }
  return { success: true, data: { results } };
}

/* ------------------------------------------------------------------ */
/* Category defaults                                                   */
/* ------------------------------------------------------------------ */

export async function saveCategoryDefaults(
  id: string,
  defaultChannels: Record<string, boolean>
): Promise<ActionResult> {
  await requireSuperadmin();
  const repo = await notificationCategoryRepository(supabaseAdmin);
  const { error } = await repo.update(id, {
    default_channels: defaultChannels,
    updated_at: new Date().toISOString()
  });
  if (error) return { error: error.message };
  invalidatePreferencesCache();
  revalidatePath(`${NOTIFICATIONS_BASE}/preferences`);
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Announcement mutations                                              */
/* ------------------------------------------------------------------ */

export async function createAnnouncement(input: {
  title: Record<string, string>;
  body: Record<string, string>;
  audience: string;
  channels: string[];
  scheduledFor?: string | null;
  targetTenantIds?: string[];
  targetUserIds?: string[];
}): Promise<ActionResult<{ id: string }>> {
  await requireSuperadmin();
  const repo = await announcementRepository(supabaseAdmin);

  const isScheduled = input.scheduledFor && new Date(input.scheduledFor) > new Date();
  const status = isScheduled ? "scheduled" : "draft";

  const { data, error } = await repo
    .insert({
      title: input.title,
      body: input.body,
      audience: input.audience,
      channels: input.channels,
      scheduled_for: input.scheduledFor ?? null,
      status
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const announcementId = data.id;

  // simpan target bila perlu
  if (
    input.audience === "specific_tenant" &&
    input.targetTenantIds &&
    input.targetTenantIds.length
  ) {
    const targetRepo = await announcementTargetRepository(supabaseAdmin);
    await targetRepo.insert(
      input.targetTenantIds.map((tenant_id) => ({ announcement_id: announcementId, tenant_id }))
    );
  } else if (
    input.audience === "selected_users" &&
    input.targetUserIds &&
    input.targetUserIds.length
  ) {
    const targetRepo = await announcementTargetRepository(supabaseAdmin);
    await targetRepo.insert(
      input.targetUserIds.map((user_id) => ({ announcement_id: announcementId, user_id }))
    );
  }

  revalidatePath(`${NOTIFICATIONS_BASE}/announcements`);

  // Bila "Publish now" (bukan terjadwal) → kirim langsung (sync).
  if (!isScheduled) {
    await notificationService.sendAnnouncement(announcementId);
    revalidatePath(`${NOTIFICATIONS_BASE}/announcements`);
    revalidatePath(`${NOTIFICATIONS_BASE}/delivery-logs`);
  }

  return { success: true, data: { id: announcementId } };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  await requireSuperadmin();
  const repo = await announcementRepository(supabaseAdmin);
  const { error } = await repo.delete(id);
  if (error) return { error: error.message };
  revalidatePath(`${NOTIFICATIONS_BASE}/announcements`);
  return { success: true };
}

export async function publishAnnouncement(id: string): Promise<ActionResult<{ processed: number }>> {
  await requireSuperadmin();
  const { processed } = await notificationService.sendAnnouncement(id);
  revalidatePath(`${NOTIFICATIONS_BASE}/announcements`);
  revalidatePath(`${NOTIFICATIONS_BASE}/delivery-logs`);
  return { success: true, data: { processed } };
}
