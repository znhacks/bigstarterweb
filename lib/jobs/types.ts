// lib/jobs/types.ts
//
// Tipe terpadu untuk background jobs. Provider-agnostic: logika job (registry)
// tidak tahu siapa yang mengeksekusinya (trigger.dev / bullmq / vercel).

export type JobProviderName = "trigger" | "vercel" | "bullmq";

export interface JobCtx {
  jobId?: string;
  attempt?: number;
  logger?: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

/** Handler sebenarnya — single source of truth, dipanggil oleh semua provider. */
export type JobHandler<T = unknown> = (payload: T, ctx: JobCtx) => Promise<unknown>;

export interface EnqueueOptions {
  /** Tunda eksekusi (detik). */
  delaySeconds?: number;
}

export interface JobDispatchResult {
  id: string;
  provider: JobProviderName;
}

/** Interface dispatch tiap provider. */
export interface BackgroundJobsProvider {
  readonly name: JobProviderName;
  /** Antrekan job untuk dijalankan (sekali, opsional delayed). */
  enqueue(id: string, payload?: unknown, opts?: EnqueueOptions): Promise<JobDispatchResult>;
  /** Daftarkan jadwal berulang (cron). */
  schedule(id: string, cron: string, payload?: unknown): Promise<JobDispatchResult>;
}
