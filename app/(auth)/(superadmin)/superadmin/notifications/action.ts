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
/* Seeds & Reads                                                       */
/* ------------------------------------------------------------------ */

async function ensureNotificationSeeds() {
  try {
    const catRepo = await notificationCategoryRepository(supabaseAdmin);
    const { data: existingCats } = await catRepo.query().select("id").limit(1);

    if (!existingCats || existingCats.length === 0) {
      const categoriesSeed = [
        { id: "system", label_key: "notifications.category.system", description: "System & app-level alerts", default_channels: { in_app: true, email: true, push: false }, sort_order: 0, is_system: true },
        { id: "payment", label_key: "notifications.category.payment", description: "Payment events", default_channels: { in_app: true, email: true, push: false }, sort_order: 10, is_system: true },
        { id: "subscription", label_key: "notifications.category.subscription", description: "Subscription lifecycle", default_channels: { in_app: true, email: true, push: false }, sort_order: 20, is_system: true },
        { id: "trial", label_key: "notifications.category.trial", description: "Trial reminders", default_channels: { in_app: true, email: true, push: false }, sort_order: 30, is_system: true },
        { id: "security", label_key: "notifications.category.security", description: "Security & account access", default_channels: { in_app: true, email: true, push: true }, sort_order: 40, is_system: true },
        { id: "account", label_key: "notifications.category.account", description: "Account changes", default_channels: { in_app: true, email: true, push: false }, sort_order: 50, is_system: true },
        { id: "invitation", label_key: "notifications.category.invitation", description: "Tenant invitations", default_channels: { in_app: true, email: true, push: false }, sort_order: 60, is_system: true },
        { id: "member", label_key: "notifications.category.member", description: "Membership changes", default_channels: { in_app: true, email: true, push: false }, sort_order: 70, is_system: true },
        { id: "announcement", label_key: "notifications.category.announcement", description: "Admin announcements", default_channels: { in_app: true, email: true, push: false }, sort_order: 80, is_system: true },
        { id: "marketing", label_key: "notifications.category.marketing", description: "Marketing & promotional", default_channels: { in_app: false, email: true, push: false }, sort_order: 90, is_system: true }
      ];
      await catRepo.insert(categoriesSeed);
    }

    const tplRepo = await notificationTemplateRepository(supabaseAdmin);
    const { data: existingTpls } = await tplRepo.query().select("id").limit(1);

    if (!existingTpls || existingTpls.length === 0) {
      const templatesSeed = [
        { id: "security.login_new_device", category: "security", title: { id: "Login dari Perangkat Baru", en: "New Device Login" }, body: { id: "Akun Anda baru saja digunakan untuk login dari perangkat baru.", en: "Your account was recently used to log in from a new device." }, channels: ["in_app", "email"], variables: { device: { type: "string" } }, link: "/settings/security", is_enabled: true, is_system: true },
        { id: "security.password_changed", category: "security", title: { id: "Kata Sandi Diubah", en: "Password Changed" }, body: { id: "Kata sandi akun Anda telah berhasil diperbarui.", en: "Your account password has been successfully updated." }, channels: ["in_app", "email"], variables: {}, link: "/settings/security", is_enabled: true, is_system: true },
        { id: "payment.success", category: "payment", title: { id: "Pembayaran Berhasil", en: "Payment Successful" }, body: { id: "Pembayaran untuk paket {{plan}} sebesar {{amount}} telah diterima.", en: "Payment for {{plan}} of {{amount}} was successfully received." }, channels: ["in_app", "email"], variables: { plan: { type: "string" }, amount: { type: "string" } }, link: "/settings/billing", is_enabled: true, is_system: true },
        { id: "subscription.expiring", category: "subscription", title: { id: "Langganan Akan Berakhir", en: "Subscription Expiring Soon" }, body: { id: "Langganan Anda akan berakhir dalam {{days}} hari.", en: "Your subscription will expire in {{days}} days." }, channels: ["in_app", "email"], variables: { days: { type: "number" } }, link: "/settings/billing", is_enabled: true, is_system: true },
        { id: "invitation.received", category: "invitation", title: { id: "Undangan Organisasi Baru", en: "New Organization Invitation" }, body: { id: "Anda telah diundang untuk bergabung ke organisasi {{tenant}}.", en: "You have been invited to join organization {{tenant}}." }, channels: ["in_app", "email"], variables: { tenant: { type: "string" }, invitationId: { type: "string" } }, link: "/invitations/{{invitationId}}", is_enabled: true, is_system: true },
        { id: "announcement.new", category: "announcement", title: { id: "Pengumuman Baru dari Admin", en: "New Admin Announcement" }, body: { id: "{{title}}", en: "{{title}}" }, channels: ["in_app", "email"], variables: { title: { type: "string" } }, link: "/notifications", is_enabled: true, is_system: true },
        { id: "system.alert", category: "system", title: { id: "Peringatan Sistem", en: "System Alert" }, body: { id: "{{message}}", en: "{{message}}" }, channels: ["in_app", "email"], variables: { message: { type: "string" } }, link: "/notifications", is_enabled: true, is_system: true }
      ];
      await tplRepo.insert(templatesSeed);
    }
  } catch (err) {
    console.warn("Notice seeding notification defaults:", err);
  }
}

export async function getNotificationCategories(): Promise<SuperadminCategory[]> {
  await requireSuperadmin();
  const repo = await notificationCategoryRepository(supabaseAdmin);
  let { data } = await repo
    .query()
    .select("*")
    .order("sort_order", { ascending: true });

  if (!data || data.length === 0) {
    await ensureNotificationSeeds();
    const res = await repo.query().select("*").order("sort_order", { ascending: true });
    data = res.data;
  }

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
  let { data } = await repo
    .query()
    .select("*")
    .order("category", { ascending: true });

  if (!data || data.length === 0) {
    await ensureNotificationSeeds();
    const res = await repo.query().select("*").order("category", { ascending: true });
    data = res.data;
  }

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
  userId?: string
): Promise<ActionResult> {
  const superadminUser = await requireSuperadmin();
  const targetUserId = (userId && userId.trim()) ? userId.trim() : superadminUser.id;

  const results = await notificationService.send({
    event,
    userId: targetUserId,
    data: {
      plan: "Enterprise Pro",
      amount: "Rp1.500.000",
      days: "7",
      tenant: "JM Panel Portal",
      title: "Uji Coba Pengumuman",
      message: "Ini adalah notifikasi uji coba sistem.",
      device: "Windows Chrome Browser",
      invitationId: "test-invite-id"
    }
  });

  const anySent = results.some((r) => r.status === "sent" || r.status === "delivered");
  revalidatePath(`${NOTIFICATIONS_BASE}/delivery-logs`);

  if (!anySent) {
    return { error: `Hasil tes pengiriman: ${results.map((r) => `${r.channel}:${r.status}`).join(", ")}` };
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
