// lib/jobs/index.ts
//
// Facade publik background jobs.
//   await jobs.enqueue("notifications.process-scheduled-announcements");
//   await jobs.schedule("my-job", "*/5 * * * *");
//
// Server-only. Logika job ada di registry; provider hanya dispatch + wiring eksekusi.

import "server-only";
import { getJobsProvider } from "./factory";

export { defineJob, runJob, getJobHandler, listJobs } from "./registry";
export * from "./types";
export { jobsConfig } from "@/config/jobs";

export const jobs = {
  /** Antrekan job (sekali, opsional delayed). */
  enqueue: (id: string, payload?: unknown, opts?: { delaySeconds?: number }) =>
    getJobsProvider().enqueue(id, payload, opts),
  /** Daftarkan jadwal berulang (cron). */
  schedule: (id: string, cron: string, payload?: unknown) =>
    getJobsProvider().schedule(id, cron, payload),
  /** Nama provider aktif. */
  provider: () => getJobsProvider().name
};
