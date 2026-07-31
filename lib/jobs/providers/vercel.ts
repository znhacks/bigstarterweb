// lib/jobs/providers/vercel.ts
//
// Dispatch via Vercel (serverless). Tidak ada queue native:
//  - enqueue: POST ke /api/jobs/run/{id} (best-effort, dijalankan inline pada fungsi).
//  - schedule: TIDAK didukung dinamis — cron statis di vercel.json (dokumentasikan manual).

import { vercelJobsConfig } from "@/config/jobs";
import type { BackgroundJobsProvider } from "../types";

export const vercelProvider: BackgroundJobsProvider = {
  name: "vercel",
  async enqueue(id, payload) {
    const base = vercelJobsConfig.baseUrl || ""; // same-origin bila kosong
    const url = `${base}/api/jobs/run/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${vercelJobsConfig.secret}`
      },
      body: JSON.stringify({ payload })
    });
    if (!res.ok) {
      throw new Error(`[jobs/vercel] run route merespons ${res.status}`);
    }
    return { id, provider: "vercel" };
  },
  async schedule() {
    throw new Error(
      "[jobs/vercel] schedule() tidak didukung. Tambah entri cron di vercel.json -> /api/cron/<job>."
    );
  }
};
