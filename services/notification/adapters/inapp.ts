// services/notification/adapters/inapp.ts
//
// Channel in-app: menulis satu baris ke tabel `notifications` (inbox user).
// Memakai service-role client karena insert notifikasi datang dari sistem
// (bukan dari user sendiri) — RLS hanya mengizinkan read/update milik sendiri.

import { supabaseAdmin } from "@/lib/api/supabase-server";
import { notificationRepository } from "@/supabase/repositories/notifications";
import type {
  DeliveryResult,
  NotificationChannel,
  OutboundNotification
} from "@/interfaces/notification-channel";

export const inAppChannel: NotificationChannel = {
  name: "in_app",
  async send(msg: OutboundNotification): Promise<DeliveryResult> {
    const repo = await notificationRepository(supabaseAdmin);
    const { data, error } = await repo
      .query()
      .insert({
        user_id: msg.userId,
        tenant_id: (msg.data?.tenantId as string) ?? null,
        category: msg.category,
        title: msg.title,
        body: msg.body,
        data: msg.data ?? {},
        link: msg.link ?? null,
        source: msg.source,
        source_ref: msg.sourceRef ?? null
      })
      .select("id")
      .single();

    if (error) {
      return { channel: "in_app", status: "failed", error: error.message };
    }

    // pass-back id baris agar delivery log bisa di-link
    msg.notificationId = data.id;
    return {
      channel: "in_app",
      status: "delivered",
      provider: "supabase",
      externalId: data.id
    };
  }
};
