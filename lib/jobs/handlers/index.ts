// lib/jobs/handlers/index.ts
//
// Import side-effect semua handler agar terdaftar di registry.
// Entry point eksekusi (trigger task / bullmq worker / vercel route) mengimpor ini.

import "./notifications";
