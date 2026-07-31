// lib/jobs/providers/bullmq-connection.ts
//
// Koneksi Redis + Queue bersama (di-reuse). Worker terpisah ada di worker.ts (root).

import IORedis from "ioredis";
import { Queue } from "bullmq";
import { bullmqConfig } from "@/config/jobs";

let connection: IORedis | null = null;
let queue: Queue | null = null;

export function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(bullmqConfig.redisUrl, {
      maxRetriesPerRequest: null // wajib untuk BullMQ
    });
  }
  return connection;
}

export function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(bullmqConfig.queueName, { connection: getConnection() });
  }
  return queue;
}
