// config/notification.ts
//
// Konfigurasi runtime Notification Center. Cerminan config/payment.ts.
// Channel aktif ditentukan env; push hanya diaktifkan bila VAPID terkonfigurasi
// (graceful degradation → channel di-skip di delivery log, bukan error).

import type { NotificationChannelName } from "@/interfaces/notification-channel";
import { NOTIFICATION_CATEGORIES } from "./notification-definitions";

function parseChannels(
  env?: string,
  fallback = "in_app,email,push"
): NotificationChannelName[] {
  const raw = (env || fallback)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return raw.filter(
    (c): c is NotificationChannelName =>
      c === "in_app" || c === "email" || c === "push"
  );
}

// VAPID (Web Push). NEXT_PUBLIC_* tersedia di client untuk subscribe.
export const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
export const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
export const vapidSubject = process.env.VAPID_SUBJECT || "";

export const isPushConfigured = Boolean(
  vapidPublicKey && vapidPrivateKey && vapidSubject
);

export const notificationConfig = {
  /** Channel yang di-enable via env. */
  enabledChannels: parseChannels(
    process.env.NEXT_PUBLIC_ENABLED_NOTIFICATION_CHANNELS
  ),
  defaultLocale: "en"
};

/**
 * Channel aktif secara efektif = enabledChannels, dikurangi channel yang butuh
 * konfigurasi tapi belum diset. Push di-skip bila VAPID belum ada.
 */
export function getActiveChannels(): NotificationChannelName[] {
  return notificationConfig.enabledChannels.filter((channel) => {
    if (channel === "email") {
      // email memakai lib/mail/dispatcher; anggap aktif bila MAIL_PROVIDER ada.
      return Boolean(process.env.MAIL_PROVIDER);
    }
    if (channel === "push") return isPushConfigured;
    return true; // in_app selalu aktif
  });
}

/** Default preferensi per kategori (fallback bila user belum punya row). */
export const DEFAULT_PREFERENCES: Record<
  string,
  Record<NotificationChannelName, boolean>
> = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map((c) => [c.id, { ...c.defaultChannels }])
) as Record<string, Record<NotificationChannelName, boolean>>;

export const pushConfig = {
  publicKey: vapidPublicKey,
  privateKey: vapidPrivateKey,
  subject: vapidSubject
};
