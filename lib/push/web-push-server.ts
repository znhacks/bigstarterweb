// lib/push/web-push-server.ts
//
// Wrapper server-only untuk library `web-push` (VAPID). Hanya boleh dipakai di
// server (Node runtime) — route handler / server action / cron. Konfigurasi
// VAPID di-set sekali secara lazy dari env (lihat config/notification.ts).

import webpush from "web-push";
import { pushConfig } from "@/config/notification";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (pushConfig.publicKey && pushConfig.privateKey && pushConfig.subject) {
    webpush.setVapidDetails(
      pushConfig.subject,
      pushConfig.publicKey,
      pushConfig.privateKey
    );
    configured = true;
  }
}

export function isPushConfigured() {
  return Boolean(
    pushConfig.publicKey && pushConfig.privateKey && pushConfig.subject
  );
}

export interface PushSubscriptionLike {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
}

/**
 * Kirim payload push ke satu subscription. Melempar error bila subscription
 * sudah tidak valid (statusCode 404/410) — caller wajib menangani & menghapus.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionLike,
  payload: Record<string, unknown>
) {
  ensureConfigured();
  if (!isPushConfigured()) {
    throw new Error("Web Push VAPID belum dikonfigurasi.");
  }
  return webpush.sendNotification(
    subscription as any,
    JSON.stringify(payload),
    { TTL: 24 * 60 * 60 }
  );
}
