# Notification Center (Developer Docs)

Modul notifikasi BigStarter. Channel-agnostic: in-app, email, push (Web Push).
Tambah channel baru (SMS/WhatsApp/Discord) nanti **tanpa** mengubah alur bisnis.

> Lokasi: `app/(auth)/(superadmin)/superadmin/notifications/` (admin),
> `app/(auth)/(users)/notifications/` + `.../settings/notifications/` (user),
> `services/notification/`, `supabase/repositories/`, `lib/push/`.

---

## 1. Arsitektur (cerminan modul billing)

```
event/announcement
   ↓
notificationService.send({ event, userId, data })      services/notification/notification-service.ts
   ↓ resolve template → locale → preferensi → channel aktif
NotificationFactory.getChannel(c).send(msg)            services/notification/factory.ts
   ↓                                                       adapters: inapp / email / push
   ├── in_app  → insert ke tabel `notifications`         (inbox user)
   ├── email   → lib/mail/dispatcher.ts sendEmail()
   └── push    → web-push (VAPID) ke push_subscriptions
   ↓
notification_delivery_logs  (audit per channel, always written — termasuk 'skipped')
```

Semua tabel di schema **`public`** (global, bukan tenant-scoped), di-key `user_id`/`tenant_id`
+ RLS — sama seperti `subscriptions`/`transactions`. Alasan: announcement & notifikasi
keamanan mencakup banyak tenant. Lihat: [tenant-schema-resolution].

---

## 2. Skema database

Migrasi: `supabase/migrations/20260730000000_notification-center.sql` (idempoten).

| Tabel | Untuk | Kunci RLS |
|---|---|---|
| `notification_categories` | Daftar kategori (payment, security, …) + default_channels | read: authenticated; write: service-role |
| `notification_templates` | Template per event (`id = "payment.success"`), title/body JSON per locale, channels, is_enabled | read: authenticated; write: service-role |
| `announcements` | Broadcast manual superadmin (audience, channels, status, scheduled_for) | read: authenticated; write: service-role |
| `announcement_targets` | Target tenant/user untuk announcement | service-role only |
| `notifications` | **Inbox in-app** (1 baris per user per notifikasi, is_read, link) | CRUD: `user_id = auth.uid()` |
| `notification_preferences` | Preferensi channel per kategori (jsonb, 1 row per user) | CRUD: `user_id = auth.uid()` |
| `notification_delivery_logs` | Audit pengiriman (status: sent/delivered/failed/skipped) | read own; write service-role |
| `push_subscriptions` | Device token Web Push (1 user → banyak device) | CRUD: `user_id = auth.uid()` |

**Realtime:** tabel `notifications` & `announcements` ditambahkan ke publication
`supabase_realtime`.

### Model hak akses (RLS vs superadmin)
- **User biasa** memakai client RLS (`createClient()` / browser `supabase`) → hanya
  baris miliknya (inbox, preferensi, device, log sendiri).
- **Superadmin** memakai `supabaseAdmin` (service-role, **bypass RLS**) → bisa membaca
  SEMUA log/notifikasi/profile lintas user. Semua server action superadmin diawali
  `requireSuperadmin()` + `supabaseAdmin`.
- Realtime juga menerapkan RLS: browser user HANYA menerima perubahan notifikasinya
  sendiri (itulah sebabnya hook tidak memakai filter `user_id`).

---

## 3. Cara membuat / menambah KATEGORI & TEMPLATE baru  ← (pertanyaan #1)

Kategori dan template **sistem di-seed**, bukan diketik manual lewat UI. Alasannya:
`id` template = key event yang dipanggil di kode (`notificationService.send({ event: "payment.success" })`).
Event baru harus ada di kode dulu, jadi seed dari repo menjaga konsistensi.

### Sumber kebenaran
- **Config:** `config/notification-definitions.ts`
  - `NOTIFICATION_CATEGORIES` — daftar kategori + label i18n key + default channels.
  - `SYSTEM_TEMPLATES_SEED` — daftar template sistem (event, kategori, title/body per locale, channels, variables).
- **Seed DB:** `supabase/migrations/20260730000000_notification-center.sql`
  bagian `SEED` — `insert ... on conflict (id) do nothing` (idempoten).

### Langkah menambah kategori baru (mis. `billing`)
1. Tambah entri ke `NOTIFICATION_CATEGORIES` di `config/notification-definitions.ts`.
2. Tambah label i18n: `messages/{en,id,ar}.json` → `notifications.category.billing`.
3. Buat **migrasi baru** `supabase/migrations/<timestamp>_notification-seed-billing.sql`:
   ```sql
   insert into public.notification_categories (id, label_key, description, default_channels, sort_order, is_system)
   values ('billing','notifications.category.billing','Billing events','{"in_app":true,"email":true,"push":false}'::jsonb,15,true)
   on conflict (id) do nothing;
   ```
4. Jalankan `npx supabase db push` (atau apply via dashboard).

### Langkah menambah template baru (mis. `invoice.ready`)
1. Pastikan event akan dipanggil di kode (lihat §4).
2. Tambah ke `SYSTEM_TEMPLATES_SEED` di `config/notification-definitions.ts`.
3. Buat migrasi baru:
   ```sql
   insert into public.notification_templates (id, category, title, body, channels, variables, is_enabled, is_system)
   values (
     'invoice.ready','billing',
     '{"en":"Invoice Ready","id":"Faktur Siap","ar":"الفاتورة جاهزة"}'::jsonb,
     '{"en":"Invoice {{number}} is ready.","id":"Faktur {{number}} siap.","ar":"الفاتورة {{number}} جاهزة."}'::jsonb,
     array['in_app','email'],'{"number":{"type":"string"}}'::jsonb, true, true
   )
   on conflict (id) do nothing;
   ```
4. `npx supabase db push`.

### Mengedit via UI (tanpa migrasi)
Superadmin bisa (tanpa kode/migrasi):
- **Templates** → ubah judul/isi per bahasa, channel aktif, link, toggle enabled.
- **Preferences** → ubah `default_channels` per kategori (default untuk user baru).
Yang **tidak** bisa dari UI: menambah/menghapus baris kategori atau event template baru
(karena terikat kode event). Gunakan migrasi untuk itu.

> Tips: prefer menyimpan perubahan konten template lewat UI (tersimpan ke tabel).
> Migrasi dipakai hanya untuk **menambah** kategori/event baru atau reset seed.

---

## 4. Mengirim notifikasi dari kode

```ts
import { notificationService } from "@/services/notification/notification-service";

await notificationService.send({
  event: "payment.success",   // = id template
  userId,                      // wajib
  tenantId,                    // opsional (untuk link/konteks)
  data: { amount: "Rp50.000", plan: "Pro", invoice: "INV-001" } // interpolasi {{var}}
});
```

Service akan: load template → resolve locale dari profile/country → interpolasi
`{{var}}` → hitung effective channels (template ∩ env ∩ preferensi user) → kirim per
channel → tulis `notification_delivery_logs` (termasuk `skipped` bila tidak ada channel
aktif). **Aman dipanggil di server action / route handler / cron** (memakai service-role).

Contoh titik integrasi: webhook pembayaran (`app/api/billing/webhook/[provider]/route.ts`),
alur invite/accept, `password.changed` saat ganti sandi, `login.new_device` saat login baru.

---

## 5. Announcements (broadcast manual)

Dipublikasi superadmin lewat UI **Announcements**:
- audience: `all_users` | `specific_tenant` | `selected_users`
- channels: in_app / email / push
- schedule: Now atau waktu tertentu (status `scheduled`)

Fan-out = materialisasi 1 baris `notifications` per penerima + kirim per channel.
`sendAnnouncement(id)` sinkron. Announcement terjadwal diproses cron (§7).

Pemanggilan langsung:
```ts
await notificationService.sendAnnouncement(announcementId);
```

---

## 6. Channel & adapter

Interface: `interfaces/notification-channel.ts` (`NotificationChannel.send(msg) → DeliveryResult`).
Factory: `services/notification/factory.ts` (`getChannel(name)`, `getEnabledChannels()`).

| Channel | Adapter | Aktif ketika |
|---|---|---|
| `in_app` | `adapters/inapp.ts` (insert `notifications`) | selalu |
| `email` | `adapters/email.ts` → `lib/mail/dispatcher.ts` | `MAIL_PROVIDER` ter-set |
| `push` | `adapters/push.ts` → `lib/push/web-push-server.ts` | VAPID ter-set |

### Tambah channel baru (mis. SMS)
1. Buat `services/notification/adapters/sms.ts` meng-implement `NotificationChannel`.
2. Daftarkan di `services/notification/factory.ts`.
3. Tambah ke `NotificationChannelName` (`interfaces/notification-channel.ts`) &
   `NOTIFICATION_CHANNELS` (`config/notification-definitions.ts`).
4. Tambah label `notifications.channel.sms` + kolom di UI preferensi (otomatis dari config).

Tidak ada perubahan di `notificationService` — channel-agnostic.

---

## 7. Scheduled announcements (cron)

`app/api/cron/notifications/route.ts` (GET, dilindungi `Authorization: Bearer ${CRON_SECRET}`):
memproses `announcements where status='scheduled' and scheduled_for <= now()`.

`vercel.json`:
```json
{ "crons": [ { "path": "/api/cron/notifications", "schedule": "*/5 * * * *" } ] }
```
Set env `CRON_SECRET`. Test manual: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/notifications`.

---

## 8. Web Push (VAPID) setup

1. Generate keys sekali: `npx web-push generate-vapid-keys`.
2. Set env (`.env`):
   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   VAPID_SUBJECT=mailto:admin@example.com
   ```
3. User enable push di **Settings → Notifications → Enable push**:
   - `lib/push/client.ts` → `Notification.requestPermission()` + `pushManager.subscribe()`
   - POST ke `app/api/notifications/push/subscribe/route.ts` → simpan ke `push_subscriptions`.
4. Service worker `public/sw.js` menangani event `push` (menampilkan notifikasi walau tab
   ditutup) + `notificationclick` (membuka `link`).

> Push aktif otomatis hanya bila VAPID terkonfigurasi; jika belum, channel push di-`skip`
> di delivery log (tidak error).

---

## 9. Preferensi user

`notification_preferences.preferences` = `{ "<category>": {"in_app":bool,"email":bool,"push":bool} }`.
Effective = config default ← category `default_channels` ← override user. Cache 5 menit
(`services/notification/preferences.ts`, di-invalidate setiap mutation). User Atur di
**Settings → Notifications**. Channel yang `false` di-skip saat kirim.

---

## 10. Peta file

```
config/notification.ts                      runtime config (enabledChannels, VAPID, defaults)
config/notification-definitions.ts          kategori + seed template (source of truth)
interfaces/notification-channel.ts          interface channel terpadu
services/notification/
  notification-service.ts                   send() + sendAnnouncement() + logDelivery
  factory.ts                                registry adapter
  preferences.ts                            effective prefs + cache
  adapters/{inapp,email,push}.ts
lib/push/{web-push-server.ts,client.ts}     push server wrapper + client subscribe
public/sw.js                                service worker push
supabase/repositories/notification-*.ts     repo factory (query/insert/update/delete)
supabase/helper/notifications.ts            helper isomorphic (getNotifications, …)
hooks/use-notifications.ts                  inbox hook + Realtime
app/(auth)/(users)/notifications/           inbox page + user actions
app/(auth)/(users)/settings/notifications/  preferences + push enable
app/(auth)/(superadmin)/superadmin/notifications/  admin: templates, announcements, delivery-logs, preferences
app/api/notifications/push/subscribe/route.ts
app/api/cron/notifications/route.ts
components/layout/header/notifications.tsx  bell (live)
```

---

## Navigasi & link dinamis (GitHub-like)

Klik notifikasi mengarah ke halaman yang relevan. Prioritas href (lihat `lib/notifications/meta.ts` `resolveNotificationHref`):
1. **registry** — `defineNotificationMeta(category, { href })` builder developer (mis. `/invitations/{id}`).
2. **notification.link** — link dinamis yang di-resolve saat kirim.
3. **`/notifications/{id}`** — halaman detail (fallback).

### Link dinamis saat kirim
Template `link` **mendukung interpolasi `{{var}}`** dari `data`; caller bisa override via `send({ link })`:
```ts
await notificationService.send({
  event: "invitation.received",
  userId,
  data: { tenant: "Acme", role: "Admin", invitationId: "123" },
  link: "/invitations/{{invitationId}}"   // → disimpan /invitations/123
});
```
Announcement tanpa link → otomatis ke `/notifications/{id}` (detail).

### Registry meta (developer-extensible)
Developer fitur baru mendaftarkan ikon/href tanpa menyentuh bell/inbox:
```ts
// di modul client fitur Anda
import { defineNotificationMeta } from "@/lib/notifications/meta";
defineNotificationMeta("invitation", {
  href: (n) => (n.data?.invitationId ? `/invitations/${n.data.invitationId}` : null)
});
// key "source:category" menang sebelum "category"
```
Ikon default per kategori sudah di-seed (`notificationIcon`). Halaman detail: `app/(auth)/(users)/notifications/[id]`.

---

## 11. Troubleshooting

- **Realtime error `cannot add callbacks after subscribe()`** — sebab: nama channel
  dipakai bersama (bell + inbox) atau StrictMode double-invoke. Solusi: nama channel
  unik per instance + buat sinkron + andalkan RLS (tanpa filter). Sudah diterapkan di
  `hooks/use-notifications.ts`.
- **Delivery Logs kosong** — `getDeliveryLogs` memakai service-role (baca semua) &
  email di-fetch terpisah (bukan embedded join) agar tidak gagal; service selalu menulis
  log (termasuk `skipped`). Pastikan kirim test dari halaman Templates.
- **Email tidak terkirim** — cek `MAIL_PROVIDER` & kredensial (`lib/mail/dispatcher.ts`).
- **Push tidak muncul** — pastikan VAPID env ter-set, user sudah grant permission,
  dan `public/sw.js` ter-register.
- **Template tidak terkirim** — cek `is_enabled` dan preferensi user untuk kategori itu.
