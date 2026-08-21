// services/notification/notification-service.ts
//
// Satu-satunya entry point pengiriman notifikasi. Channel-agnostic:
//   1. load template by event  (skip bila tidak ada / disabled)
//   2. resolve penerima (email + locale via country-defaults)
//   3. interpolasi & lokalisasi title/body
//   4. effective channels = template.channels ∩ getActiveChannels() ∩ prefs(kategori)
//   5. kirim tiap channel via NotificationFactory → tulis notification_delivery_logs
//
// Memakai service-role client (supabaseAdmin) karena pengiriman adalah operasi
// sistem. Pengiriman sinkron (delivery log mencatat hasil). Announcements
// terjadwal diproses oleh cron (app/api/cron/notifications).

import { supabaseAdmin } from "@/lib/api/supabase-server";
import { profileRepository } from "@/supabase/repositories/profiles";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { notificationTemplateRepository } from "@/supabase/repositories/notification-templates";
import { announcementRepository } from "@/supabase/repositories/announcements";
import { announcementTargetRepository } from "@/supabase/repositories/announcement-targets";
import { notificationDeliveryLogRepository } from "@/supabase/repositories/notification-delivery-logs";
import { getLocalizedValue } from "@/lib/i18n/localize";
import { getCountryDefaults } from "@/lib/i18n/country-defaults";
import { getActiveChannels, notificationConfig } from "@/config/notification";
import { NotificationFactory } from "./factory";
import { getEffectivePreferences } from "./preferences";
import type {
  DeliveryResult,
  NotificationChannelName,
  NotificationSource,
  OutboundNotification
} from "@/interfaces/notification-channel";

export interface SendNotificationParams {
  /** Key template / event, mis. "payment.success". */
  event: string;
  userId: string;
  tenantId?: string;
  /** Variabel untuk interpolasi {{var}} pada title/body/link. */
  data?: Record<string, any>;
  /** Override locale (jika tidak, resolve dari profile/country). */
  locale?: string;
  /** Override link tujuan (mendukung {{var}} dari data). Mis. "/invitations/{{invitationId}}". */
  link?: string;
}

function interpolate(template: string, data: Record<string, any> = {}): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) =>
    data[k] != null ? String(data[k]) : ""
  );
}

async function resolveRecipient(userId: string) {
  const repo = await profileRepository(supabaseAdmin);
  const { data: profile } = await repo
    .query()
    .select("id, address_country")
    .eq("id", userId)
    .maybeSingle();

  let email: string | undefined;
  try {
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
    email = authData?.user?.email;
  } catch (err) {
    // ignore
  }

  if (!profile) return { id: userId, email };
  return { ...profile, email };
}

function resolveLocale(profile: any, override?: string): string {
  if (override) return override;
  if (profile?.address_country) {
    const defaults = getCountryDefaults(profile.address_country);
    if (defaults?.locale) return defaults.locale;
  }
  return notificationConfig.defaultLocale;
}

async function logDelivery(entry: {
  user_id: string;
  notification_id?: string | null;
  channel: NotificationChannelName;
  category: string | null;
  title: string | null;
  status: DeliveryResult["status"];
  error?: string | null;
  provider?: string | null;
  source: NotificationSource;
  source_ref?: string | null;
}) {
  const repo = await notificationDeliveryLogRepository(supabaseAdmin);
  await repo.insert({
    user_id: entry.user_id,
    notification_id: entry.notification_id ?? null,
    channel: entry.channel,
    category: entry.category,
    title: entry.title,
    status: entry.status,
    error: entry.error ?? null,
    provider: entry.provider ?? null,
    source: entry.source,
    source_ref: entry.source_ref ?? null
  });
}

/**
 * Kirim notifikasi sistem berdasarkan event. Mengembalikan hasil per channel.
 */
export async function sendNotification(
  params: SendNotificationParams
): Promise<DeliveryResult[]> {
  const { event, userId, tenantId, data = {}, locale } = params;

  const templateRepo = await notificationTemplateRepository(supabaseAdmin);
  const { data: tpl } = await templateRepo
    .query()
    .select("*")
    .eq("id", event)
    .maybeSingle();

  if (!tpl || !tpl.is_enabled) {
    await logDelivery({
      user_id: userId,
      channel: "in_app",
      category: tpl?.category ?? null,
      title: event,
      status: "skipped",
      error: !tpl ? "template not found" : "template disabled",
      source: "system",
      source_ref: event
    });
    return [{ channel: "in_app", status: "skipped", error: "template not found/disabled" }];
  }

  const profile = await resolveRecipient(userId);
  const resolvedLocale = resolveLocale(profile, locale);
  const title = interpolate(String(getLocalizedValue(tpl.title, resolvedLocale)), data);
  const body = interpolate(String(getLocalizedValue(tpl.body, resolvedLocale)), data);
  // Link tujuan: override dari caller > link template; mendukung interpolasi {{var}}.
  const linkPattern = params.link ?? tpl.link ?? null;
  const link = linkPattern ? interpolate(linkPattern, data) : null;

  const activeChannels = getActiveChannels();
  const prefs = await getEffectivePreferences(userId);
  const categoryPrefs = prefs[tpl.category] ?? {};
  const channels = (tpl.channels as NotificationChannelName[]).filter(
    (c) => activeChannels.includes(c) && categoryPrefs[c] !== false
  );

  if (channels.length === 0) {
    // Tetap catat audit (skipped) walau tidak ada channel aktif, supaya
    // halaman Delivery Logs selalu menampilkan setiap upaya pengiriman.
    await logDelivery({
      user_id: userId,
      channel: "in_app",
      category: tpl.category,
      title,
      status: "skipped",
      error: "no active channel (disabled by config or user preference)",
      source: "system",
      source_ref: event
    });
    return [
      { channel: "in_app", status: "skipped", error: "no active channel" }
    ];
  }

  const results: DeliveryResult[] = [];
  const msg: OutboundNotification = {
    userId,
    to: profile?.email,
    title,
    body,
    data: { ...data, tenantId },
    link,
    category: tpl.category,
    locale: resolvedLocale,
    source: "system",
    sourceRef: event
  };

  for (const channel of channels) {
    const adapter = NotificationFactory.getChannel(channel);
    let result: DeliveryResult;
    try {
      result = await adapter.send(msg);
    } catch (e: any) {
      result = { channel, status: "failed", error: e?.message ?? String(e) };
    }
    await logDelivery({
      user_id: userId,
      notification_id: channel === "in_app" ? msg.notificationId ?? null : null,
      channel,
      category: tpl.category,
      title,
      status: result.status,
      error: result.error ?? null,
      provider: result.provider ?? null,
      source: "system",
      source_ref: event
    });
    results.push(result);
  }

  return results;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/** Resolve daftar user id tujuan sebuah announcement berdasarkan audience. */
async function resolveAnnouncementRecipients(
  announcementId: string,
  audience: string
): Promise<string[]> {
  if (audience === "specific_tenant") {
    const targetRepo = await announcementTargetRepository(supabaseAdmin);
    const { data: targets } = await targetRepo
      .query()
      .select("tenant_id")
      .eq("announcement_id", announcementId);
    const tenantIds = (targets ?? [])
      .map((t) => t.tenant_id)
      .filter((id): id is string => Boolean(id));
    if (!tenantIds.length) return [];
    const memRepo = await membershipRepository(supabaseAdmin);
    const { data: mems } = await memRepo
      .query()
      .select("user_id")
      .in("tenant_id", tenantIds);
    return unique((mems ?? []).map((m) => m.user_id));
  }

  if (audience === "selected_users") {
    const targetRepo = await announcementTargetRepository(supabaseAdmin);
    const { data: targets } = await targetRepo
      .query()
      .select("user_id")
      .eq("announcement_id", announcementId);
    return (targets ?? [])
      .map((t) => t.user_id)
      .filter((id): id is string => Boolean(id));
  }

  // all_users
  const profileRepo = await profileRepository(supabaseAdmin);
  const { data: users } = await profileRepo.query().select("id");
  return unique((users ?? []).map((u) => u.id));
}

/**
 * Fan-out announcement ke semua penerima (synchronous). Dipanggil oleh
 * publishAnnouncement (superadmin) atau cron untuk announcement terjadwal.
 */
export async function sendAnnouncement(
  announcementId: string
): Promise<{ processed: number }> {
  const annRepo = await announcementRepository(supabaseAdmin);
  const { data: ann } = await annRepo
    .query()
    .select("*")
    .eq("id", announcementId)
    .maybeSingle();
  if (!ann) return { processed: 0 };

  await annRepo.update(announcementId, { status: "sending" });

  const userIds = await resolveAnnouncementRecipients(announcementId, ann.audience);
  const activeChannels = getActiveChannels();
  const channels = (ann.channels as NotificationChannelName[]).filter((c) =>
    activeChannels.includes(c)
  );

  for (const userId of userIds) {
    const profile = await resolveRecipient(userId);
    const resolvedLocale = resolveLocale(profile);
    const title = String(getLocalizedValue(ann.title, resolvedLocale));
    const body = String(getLocalizedValue(ann.body, resolvedLocale));

    const prefs = await getEffectivePreferences(userId);
    const categoryPrefs = prefs["announcement"] ?? {};
    const userChannels = channels.filter((c) => categoryPrefs[c] !== false);

    const msg: OutboundNotification = {
      userId,
      to: profile?.email,
      title,
      body,
      data: { announcementId },
      link: null,
      category: "announcement",
      locale: resolvedLocale,
      source: "announcement",
      sourceRef: announcementId
    };

    for (const channel of userChannels) {
      const adapter = NotificationFactory.getChannel(channel);
      let result: DeliveryResult;
      try {
        result = await adapter.send(msg);
      } catch (e: any) {
        result = { channel, status: "failed", error: e?.message ?? String(e) };
      }
      await logDelivery({
        user_id: userId,
        notification_id: channel === "in_app" ? msg.notificationId ?? null : null,
        channel,
        category: "announcement",
        title,
        status: result.status,
        error: result.error ?? null,
        provider: result.provider ?? null,
        source: "announcement",
        source_ref: announcementId
      });
    }
  }

  await annRepo.update(announcementId, {
    status: "sent",
    sent_at: new Date().toISOString()
  });
  return { processed: userIds.length };
}

/**
 * Facade dengan API ringkas sesuai rencana:
 *   await notificationService.send({ event, userId, data });
 */
export const notificationService = {
  send: sendNotification,
  sendAnnouncement
};
