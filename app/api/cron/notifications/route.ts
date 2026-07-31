// app/api/cron/notifications/route.ts
//
// Entry cron untuk provider Vercel (scheduled-only). Kini tipis: hanya memanggil
// registry handler. Default project memakai trigger.dev (jadwal dimiliki Trigger);
// route ini aktif hanya jika provider=vercel + entri cron di vercel.json.
// Dilindungi JOBS_SECRET (fallback CRON_SECRET).

import { NextRequest, NextResponse } from "next/server";
import "@/lib/jobs/handlers"; // side-effect: registrasi handler
import { runJob } from "@/lib/jobs/registry";
import { PROCESS_SCHEDULED_ANNOUNCEMENTS } from "@/lib/jobs/handlers/notifications";
import { vercelJobsConfig } from "@/config/jobs";

export async function GET(req: NextRequest) {
  const secret = vercelJobsConfig.secret;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runJob(PROCESS_SCHEDULED_ANNOUNCEMENTS);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
