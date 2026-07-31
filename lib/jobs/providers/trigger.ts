// lib/jobs/providers/trigger.ts
//
// Dispatch via trigger.dev (v3+). tasks/schedules otomatis memakai TRIGGER_SECRET_KEY.
// Eksekusi sebenarnya ada di app/trigger/[...trigger]/route.ts yang memanggil registry.

import { schedules, tasks } from "@trigger.dev/sdk";
import { isTriggerConfigured } from "@/config/jobs";
import type { BackgroundJobsProvider } from "../types";

function ensure() {
  if (!isTriggerConfigured) {
    throw new Error("[jobs/trigger] TRIGGER_SECRET_KEY belum diset");
  }
}

export const triggerProvider: BackgroundJobsProvider = {
  name: "trigger",
  async enqueue(id, payload) {
    ensure();
    const handle = await tasks.trigger(id, payload as any);
    return { id: handle.id, provider: "trigger" };
  },
  async schedule(id, cron) {
    ensure();
    const schedule = await schedules.create({
      task: id,
      cron,
      deduplicationKey: `schedule-${id}`
    });
    return { id: schedule.id, provider: "trigger" };
  }
};
