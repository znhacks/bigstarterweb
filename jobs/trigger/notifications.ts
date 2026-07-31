// jobs/trigger/notifications.ts
//
// Task trigger.dev yang membungkus handler registry (single source of truth).
// Task ini di-deploy ke Trigger cloud; cron schedule-nya didaftarkan via
// `npm run jobs:register-schedules` (atau dashboard Trigger).

import { task, logger } from "@trigger.dev/sdk";
import "@/lib/jobs/handlers"; // side-effect: registrasi handler di registry
import { runJob } from "@/lib/jobs/registry";
import { PROCESS_SCHEDULED_ANNOUNCEMENTS } from "@/lib/jobs/handlers/notifications";

export const processScheduledAnnouncements = task({
  id: PROCESS_SCHEDULED_ANNOUNCEMENTS,
  run: async () => {
    const result = await runJob(PROCESS_SCHEDULED_ANNOUNCEMENTS, undefined, {
      logger: {
        info: (...a) => logger.info(...(a as [any])),
        warn: (...a) => logger.warn(...(a as [any])),
        error: (...a) => logger.error(...(a as [any]))
      }
    });
    logger.info("[trigger] scheduled announcements processed", result as any);
    return result;
  }
});
