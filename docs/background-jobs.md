# Background Jobs — Multi-Provider

Abstraksi background jobs dengan pola adapter (sama seperti payment provider &
notification channel). Provider: **trigger.dev** (default), **Vercel**, **BullMQ**.

> Lokasi: `lib/jobs/` (framework), `jobs/trigger/` (task trigger.dev),
> `worker.ts` (BullMQ), `app/api/jobs/run/[jobId]/route.ts` (Vercel).

## Prinsip

**Logika job di satu tempat** (`lib/jobs/registry.ts` — `defineJob`/`runJob`). Tiap
provider hanya menyediakan **dispatch** (`enqueue`/`schedule`) + **wiring eksekusi**
yang memanggil registry. Tambah provider baru tanpa mengubah logika bisnis.

## Pemakaian

```ts
import { jobs } from "@/lib/jobs";

// Antre job (sekali, opsional delayed)
await jobs.enqueue("notifications-process-scheduled-announcements");
await jobs.enqueue("my-job", { foo: 1 }, { delaySeconds: 60 });

// Jadwalkan cron berulang
await jobs.schedule("my-job", "*/5 * * * *");
```

## Provider aktif

`BACKGROUND_JOBS_PROVIDER` (default `trigger`). Lihat `config/jobs.ts`.

| Provider | Dispatch | Eksekusi | Aktif ketika |
|---|---|---|---|
| **trigger.dev** | `tasks.trigger` / `schedules.create` | Trigger cloud (deploy via CLI) | `TRIGGER_SECRET_KEY` |
| **bullmq** | `queue.add` / `upsertJobScheduler` | `npm run worker` (Redis) | `REDIS_URL` |
| **vercel** | POST `/api/jobs/run/[jobId]` | route handler (inline) | selalu (scheduled-only) |

## trigger.dev v3+ (default)

Task didefinisikan di `jobs/trigger/*` (membungkus registry), di-deploy ke Trigger cloud:

```bash
npx trigger.dev@latest init      # sekali (setup project ref)
npm run trigger:dev              # tunnel lokal untuk dev
npm run trigger:deploy           # deploy task ke Trigger cloud
npm run jobs:register-schedules  # daftarkan cron schedule
```

Env: `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF`. `syncVercelEnvVars()` (di
`trigger.config.ts`) menyalin env Vercel ke Trigger agar task bisa akses
Supabase/Mail/VAPID.

> Catatan: trigger.dev v4 **tidak lagi memakai route handler** di app Next.js —
> task di-deploy ke Trigger cloud. Next.js app hanya `tasks.trigger()`.

## BullMQ

```bash
npm run worker   # butuh REDIS_URL
```
BullMQ v6: schedule repeat pakai `queue.upsertJobScheduler` (bukan `queue.add({repeat})`).
Butuh worker proses persistent (VM/container) — **bukan serverless Vercel**.

## Vercel

Scheduled-only (cron statis di `vercel.json`). `enqueue` = HTTP POST ke
`/api/jobs/run/[jobId]` (dijalankan inline). `schedule()` TIDAK didukung dinamis —
tambah entri `vercel.json` manual:
```json
{ "crons": [{ "path": "/api/cron/notifications", "schedule": "*/5 * * * *" }] }
```

## Menambah job baru

1. Buat handler di `lib/jobs/handlers/<area>.ts`: `defineJob("my-job", async (payload, ctx) => {...})`.
2. Import side-effect di `lib/jobs/handlers/index.ts`.
3. (trigger.dev) bungkus dengan `task({ id: "my-job", run: () => runJob("my-job", ...) })` di `jobs/trigger/`.
4. Dispatch: `await jobs.enqueue("my-job", data)`.

## File map

```
lib/jobs/types.ts                        tipe terpadu
lib/jobs/registry.ts                     defineJob / runJob (single source of truth)
lib/jobs/handlers/                       handler job (notifications, …)
lib/jobs/providers/{trigger,bullmq,vercel}.ts   dispatch per provider
lib/jobs/factory.ts                      getJobsProvider()
lib/jobs/index.ts                        facade jobs.enqueue / jobs.schedule
config/jobs.ts                           provider aktif + availability
trigger.config.ts                        config trigger.dev
jobs/trigger/                            task trigger.dev (membungkus registry)
worker.ts                                worker BullMQ
app/api/jobs/run/[jobId]/route.ts        execution entrypoint Vercel
app/api/cron/notifications/route.ts      cron tipis → registry (provider Vercel)
scripts/register-schedules.ts            daftar cron schedule ke provider aktif
```

## Env

```
BACKGROUND_JOBS_PROVIDER=trigger   # trigger | vercel | bullmq
TRIGGER_SECRET_KEY=                # trigger.dev
TRIGGER_PROJECT_REF=
REDIS_URL=                         # bullmq
JOBS_SECRET=                       # proteksi /api/jobs/run & /api/cron/* (reuse CRON_SECRET)
```
