// services/notification/adapters/push.ts
//
// Channel push (Web Push via VAPID). Mengirim ke SEMUA device yang terdaftar
// milik user. Subscription yang sudah expired/invalid (410/404) otomatis dihapus.

import { supabaseAdmin } from "@/lib/api/supabase-server";
import { pushSubscriptionRepository } from "@/supabase/repositories/push-subscriptions";
import {
  isPushConfigured,
  sendPushNotification
} from "@/lib/push/web-push-server";
import type {
  DeliveryResult,
  NotificationChannel,
  OutboundNotification
} from "@/interfaces/notification-channel";

export const pushChannel: NotificationChannel = {
  name: "push",
  async send(msg: OutboundNotification): Promise<DeliveryResult> {
    if (!isPushConfigured()) {
      return { channel: "push", status: "skipped", error: "VAPID not configured" };
    }

    const repo = await pushSubscriptionRepository(supabaseAdmin);
    const { data: subs, error } = await repo
      .query()
      .select("id, endpoint, keys")
      .eq("user_id", msg.userId);

    if (error) return { channel: "push", status: "failed", error: error.message };
    if (!subs || subs.length === 0) {
      return { channel: "push", status: "skipped", error: "no registered devices" };
    }

    const payload = {
      title: msg.title,
      body: msg.body,
      data: {
        link: msg.link ?? "/notifications",
        category: msg.category,
        notificationId: msg.notificationId ?? null
      },
      icon: "/icons/icon-192.png",
      tag: msg.category
    };

    let ok = 0;
    for (const sub of subs) {
      try {
        await sendPushNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
        ok++;
      } catch (e: any) {
        const code = e?.statusCode;
        // 404/410 = subscription tidak valid lagi → hapus
        if (code === 404 || code === 410) {
          await repo.delete(sub.id);
        }
      }
    }

    if (ok === 0) {
      return {
        channel: "push",
        status: "failed",
        error: "no successful delivery",
        provider: "web-push"
      };
    }
    return { channel: "push", status: "sent", provider: "web-push" };
  }
};
