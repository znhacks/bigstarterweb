// trigger.config.ts
//
// Konfigurasi trigger.dev (v3+). Task didefinisikan di jobs/trigger/* dan
// di-deploy ke Trigger cloud via `npx trigger.dev@latest deploy`. Aplikasi
// Next.js hanya memanggil tasks.trigger()/schedules.create() untuk dispatch.
//
// project ref diisi via TRIGGER_PROJECT_REF. syncVercelEnvVars menyalin env
// Vercase ke Trigger agar task bisa akses supabase/mail/VAPID, dsb.

import { defineConfig, type TriggerConfig } from "@trigger.dev/sdk";
import { syncVercelEnvVars } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "",
  dirs: ["jobs/trigger"],
  build: {
    extensions: [syncVercelEnvVars()]
  }
} as TriggerConfig);
