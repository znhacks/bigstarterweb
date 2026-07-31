// worker.ts
//
// BullMQ worker process. Jalankan: `npm run worker` (butuh REDIS_URL).
// Untuk deployment dengan Redis (VM/container) — BUKAN serverless Vercel.
// Memproses job dengan memanggil registry handler (single source of truth).

import "@/lib/jobs/handlers"; // side-effect: registrasi handler di registry
import { Worker } from "bullmq";
import { bullmqConfig } from "@/config/jobs";
import { getConnection } from "@/lib/jobs/providers/bullmq-connection";
import { runJob } from "@/lib/jobs/registry";

if (!bullmqConfig.redisUrl) {
  console.error("[worker] REDIS_URL belum diset");
  process.exit(1);
}

const worker = new Worker(
  bullmqConfig.queueName,
  async (job) => {
    console.log(`[worker] run ${job.name} (${job.id})`);
    return runJob(job.name, job.data, {
      jobId: job.id,
      attempt: job.attemptsMade
    });
  },
  { connection: getConnection() }
);

worker.on("completed", (job) =>
  console.log(`[worker] completed ${job.name} (${job.id})`)
);
worker.on("failed", (job, err) =>
  console.error(`[worker] failed ${job?.name} (${job?.id}):`, err.message)
);

console.log(`[worker] listening on queue "${bullmqConfig.queueName}"…`);

// Graceful shutdown
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    console.log(`[worker] ${sig} received, closing…`);
    await worker.close();
    process.exit(0);
  });
}
