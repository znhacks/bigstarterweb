// lib/jobs/registry.ts
//
// Registry handler job — SINGLE SOURCE OF TRUTH untuk eksekusi.
// Tiap provider (trigger.dev task / BullMQ worker / Vercel route) memanggil runJob()
// sehingga logika bisnis ditulis sekali di sini.

import type { JobCtx, JobHandler } from "./types";

const REGISTRY = new Map<string, JobHandler<any>>();

/** Definisikan job. Modul handler memanggil ini saat import (side-effect). */
export function defineJob<T = unknown>(id: string, handler: JobHandler<T>) {
  REGISTRY.set(id, handler as JobHandler<any>);
  return { id, handler: handler as JobHandler<T> };
}

export function getJobHandler(id: string): JobHandler<any> | undefined {
  return REGISTRY.get(id);
}

export function listJobs(): string[] {
  return Array.from(REGISTRY.keys());
}

/** Jalankan job berdasarkan id. Dipanggil oleh execution entrypoint tiap provider. */
export async function runJob(
  id: string,
  payload?: unknown,
  ctx: JobCtx = {}
): Promise<unknown> {
  const handler = REGISTRY.get(id);
  if (!handler) throw new Error(`[jobs] handler tidak ditemukan: ${id}`);
  return handler(payload, ctx);
}
