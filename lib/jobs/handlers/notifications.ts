// lib/jobs/handlers/notifications.ts
//
// Job terjadwal: memproses announcement dengan status='scheduled' yang sudah due.
// Logika dipindah dari app/api/cron/notifications/route.ts agar bisa dieksekusi
// oleh provider manapun (trigger.dev / bullmq / vercel).

import { defineJob } from "@/lib/jobs/registry";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { announcementRepository } from "@/supabase/repositories/announcements";
import { sendAnnouncement } from "@/services/notification/notification-service";

// id kebab-case (trigger.dev task id tidak boleh memakai titik)
export const PROCESS_SCHEDULED_ANNOUNCEMENTS = "notifications-process-scheduled-announcements";

defineJob(PROCESS_SCHEDULED_ANNOUNCEMENTS, async (_payload, ctx) => {
  const repo = await announcementRepository(supabaseAdmin);
  const { data: due, error } = await repo
    .query()
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString());

  if (error) throw new Error(error.message);

  let sent = 0;
  for (const a of due ?? []) {
    try {
      const res = await sendAnnouncement(a.id);
      if (res.processed > 0) sent++;
    } catch (e) {
      ctx.logger?.error?.("[jobs] announcement send failed", a.id, e);
      console.error("[jobs] announcement send failed", a.id, e);
    }
  }

  return { due: due?.length ?? 0, sent };
});
