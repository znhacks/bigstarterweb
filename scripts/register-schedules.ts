// scripts/register-schedules.ts
//
// Mendaftarkan jadwal cron job ke provider aktif (default: trigger.dev).
// Jalankan setelah deploy: `npm run jobs:register-schedules`.
// Idempoten untuk trigger.dev jika memakai deduplicationKey (lihat docs Trigger).

import { jobs } from "@/lib/jobs";
import { PROCESS_SCHEDULED_ANNOUNCEMENTS } from "@/lib/jobs/handlers/notifications";

const SCHEDULES: Array<{ id: string; cron: string }> = [
  { id: PROCESS_SCHEDULED_ANNOUNCEMENTS, cron: "*/5 * * * *" }
];

async function main() {
  const provider = jobs.provider();
  console.log(`[register-schedules] provider aktif: ${provider}`);
  for (const s of SCHEDULES) {
    try {
      const res = await jobs.schedule(s.id, s.cron);
      console.log(`  ✓ ${s.id} (${s.cron}) -> ${res.id}`);
    } catch (e) {
      console.error(`  ✗ ${s.id}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
