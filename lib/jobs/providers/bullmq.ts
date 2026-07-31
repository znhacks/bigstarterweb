// lib/jobs/providers/bullmq.ts
//
// Dispatch via BullMQ (Redis queue). Eksekusi oleh worker.ts yang memanggil registry.

import type { BackgroundJobsProvider } from "../types";
import { isBullmqConfigured } from "@/config/jobs";
import { getQueue } from "./bullmq-connection";

function ensure() {
  if (!isBullmqConfigured) {
    throw new Error("[jobs/bullmq] REDIS_URL belum diset");
  }
}

export const bullmqProvider: BackgroundJobsProvider = {
  name: "bullmq",
  async enqueue(id, payload, opts) {
    ensure();
    const queue = getQueue();
    const job = await queue.add(
      id,
      payload,
      opts?.delaySeconds ? { delay: opts.delaySeconds * 1000 } : undefined
    );
    return { id: job.id ?? "", provider: "bullmq" };
  },
  async schedule(id, cron, payload) {
    ensure();
    const queue = getQueue();
    // BullMQ v6: repeat tidak lagi didukung di Queue.add → pakai upsertJobScheduler.
    await queue.upsertJobScheduler(id, { pattern: cron }, { data: payload });
    return { id, provider: "bullmq" };
  }
};
