// lib/jobs/factory.ts
//
// Memilih provider aktif dari config. Server-only (providers mengimpor SDK berat).

import "server-only";
import { jobsConfig } from "@/config/jobs";
import type { BackgroundJobsProvider, JobProviderName } from "./types";
import { triggerProvider } from "./providers/trigger";
import { bullmqProvider } from "./providers/bullmq";
import { vercelProvider } from "./providers/vercel";

const PROVIDERS: Record<JobProviderName, () => BackgroundJobsProvider> = {
  trigger: () => triggerProvider,
  bullmq: () => bullmqProvider,
  vercel: () => vercelProvider
};

let cached: BackgroundJobsProvider | null = null;

export function getJobsProvider(): BackgroundJobsProvider {
  if (cached) return cached;
  const factory = PROVIDERS[jobsConfig.provider] ?? PROVIDERS.vercel;
  cached = factory();
  return cached;
}
