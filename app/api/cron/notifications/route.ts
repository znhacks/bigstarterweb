// app/api/cron/notifications/route.ts
//
// Cron minimal untuk announcement terjadwal: memproses announcement dengan
// status='scheduled' dan scheduled_for <= now(). Dipanggil oleh Vercel Cron
// (lihat vercel.json) — lindungi dengan CRON_SECRET (Authorization: Bearer).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { announcementRepository } from "@/supabase/repositories/announcements";
import { sendAnnouncement } from "@/services/notification/notification-service";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const repo = await announcementRepository(supabaseAdmin);
  const { data: due, error } = await repo
    .query()
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const a of due ?? []) {
    try {
      const res = await sendAnnouncement(a.id);
      if (res.processed > 0) sent++;
    } catch (e) {
      console.error("[cron/notifications] announcement send failed", a.id, e);
    }
  }

  return NextResponse.json({ ok: true, due: due?.length ?? 0, sent });
}
