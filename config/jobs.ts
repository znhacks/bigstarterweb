// config/jobs.ts
//
// Konfigurasi runtime background jobs. Cerminan config/notification.ts.
// Provider aktif ditentukan env; trigger.dev adalah default.

import type { JobProviderName } from "@/lib/jobs/types";

function parseProvider(env?: string): JobProviderName {
  const v = (env || "trigger").trim().toLowerCase();
  return v === "bullmq" || v === "vercel" ? v : "trigger";
}

export const jobsConfig = {
  /** Provider aktif: trigger | vercel | bullmq */
  provider: parseProvider(process.env.BACKGROUND_JOBS_PROVIDER),
};

// trigger.dev (cloud default)
export const triggerConfig = {
  secretKey: process.env.TRIGGER_SECRET_KEY || "",
  projectRef: process.env.TRIGGER_PROJECT_REF || "",
};

// BullMQ (Redis)
export const bullmqConfig = {
  redisUrl: process.env.REDIS_URL || "",
  queueName: process.env.JOBS_QUEUE_NAME || "bigstarter-jobs",
};

// Vercel provider (cron + inline run route)
export const vercelJobsConfig = {
  secret: process.env.JOBS_SECRET || process.env.CRON_SECRET || "",
  /** Base URL opsional untuk enqueue antar-instance (mis. dari worker ke deployment). */
  baseUrl: process.env.JOBS_BASE_URL || "",
};

export const isTriggerConfigured = Boolean(triggerConfig.secretKey);
export const isBullmqConfigured = Boolean(bullmqConfig.redisUrl);
export const isVercelAvailable = true;
