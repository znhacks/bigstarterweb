-- =====================================================================
-- Notification Center (phase 1: in-app + email + push)
--
-- Semua tabel di schema PUBLIC (global, bukan tenant-scoped) — sama seperti
-- billing (subscriptions/transactions). Di-key by user_id/tenant_id + RLS.
-- Alasan: announcement & notifikasi keamanan mencakup banyak tenant; tidak
-- berhubungan dengan schema tenant_shared/tenant_<sub>.
--
-- Idempoten: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS + CREATE POLICY.
-- DDL style mengikuti 20260714000001_billing-tables-baseline.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) notification_categories
-- ---------------------------------------------------------------------
create table if not exists public.notification_categories (
  id text not null,
  label_key text not null,                 -- i18n key, mis. "notifications.category.payment"
  description text,
  default_channels jsonb not null default '{"in_app":true,"email":true,"push":false}'::jsonb,
  sort_order integer not null default 0,
  is_system boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint notification_categories_pkey primary key (id)
);

-- ---------------------------------------------------------------------
-- 2) notification_templates  (id = event key, mis. "payment.success")
-- ---------------------------------------------------------------------
create table if not exists public.notification_templates (
  id text not null,                        -- event key
  category text not null,
  title jsonb not null default '{}'::jsonb,                       -- Record<locale,string>
  body jsonb not null default '{}'::jsonb,                        -- Record<locale,string>
  channels text[] not null default '{in_app,email}'::text[],
  variables jsonb not null default '{}'::jsonb,                   -- metadata variabel template
  link text,
  is_enabled boolean not null default true,
  is_system boolean not null default true,  -- sistem: edit/toggle saja, tidak bisa hapus
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint notification_templates_pkey primary key (id),
  constraint notification_templates_category_fkey
    foreign key (category) references public.notification_categories (id) on delete restrict
);
create index if not exists idx_notification_templates_category
  on public.notification_templates using btree (category);
create index if not exists idx_notification_templates_enabled
  on public.notification_templates using btree (is_enabled);

-- ---------------------------------------------------------------------
-- 3) announcements  (broadcast manual oleh superadmin)
-- ---------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid not null default gen_random_uuid(),
  title jsonb not null default '{}'::jsonb,
  body jsonb not null default '{}'::jsonb,
  audience text not null default 'all_users',   -- all_users | specific_tenant | selected_users
  channels text[] not null default '{in_app,email}'::text[],
  status text not null default 'draft',         -- draft | scheduled | sending | sent | failed
  scheduled_for timestamptz null,
  sent_at timestamptz null,
  created_by uuid null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint announcements_pkey primary key (id),
  constraint announcements_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null
);
create index if not exists idx_announcements_status
  on public.announcements using btree (status);
create index if not exists idx_announcements_created_at
  on public.announcements using btree (created_at desc);

-- ---------------------------------------------------------------------
-- 4) announcement_targets  (untuk specific_tenant / selected_users)
-- ---------------------------------------------------------------------
create table if not exists public.announcement_targets (
  id uuid not null default gen_random_uuid(),
  announcement_id uuid not null,
  tenant_id uuid null,
  user_id uuid null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint announcement_targets_pkey primary key (id),
  constraint announcement_targets_announcement_id_fkey
    foreign key (announcement_id) references public.announcements (id) on delete cascade,
  constraint announcement_targets_tenant_id_fkey
    foreign key (tenant_id) references public.tenants (id) on delete cascade,
  constraint announcement_targets_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade
);
create index if not exists idx_announcement_targets_announcement
  on public.announcement_targets using btree (announcement_id);
create index if not exists idx_announcement_targets_tenant
  on public.announcement_targets using btree (tenant_id);

-- ---------------------------------------------------------------------
-- 5) notifications  (inbox in-app, satu baris per user per notifikasi)
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  tenant_id uuid null,
  category text not null,
  title text not null,
  body text not null default '',
  data jsonb null default '{}'::jsonb,
  link text null,
  is_read boolean not null default false,
  read_at timestamptz null,
  source text not null default 'system',       -- system | announcement
  source_ref text null,                         -- event key / announcement id
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade,
  constraint notifications_tenant_id_fkey
    foreign key (tenant_id) references public.tenants (id) on delete set null
);
create index if not exists idx_notifications_user_unread
  on public.notifications using btree (user_id, is_read);
create index if not exists idx_notifications_user_created
  on public.notifications using btree (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6) notification_preferences  (satu baris per user)
-- ---------------------------------------------------------------------
create table if not exists public.notification_preferences (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint notification_preferences_pkey primary key (id),
  constraint notification_preferences_user_id_key unique (user_id),
  constraint notification_preferences_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade
);

-- ---------------------------------------------------------------------
-- 7) notification_delivery_logs  (audit per channel)
-- ---------------------------------------------------------------------
create table if not exists public.notification_delivery_logs (
  id uuid not null default gen_random_uuid(),
  notification_id uuid null,
  user_id uuid not null,
  channel text not null,                        -- in_app | email | push
  category text null,
  title text null,
  status text not null,                         -- sent | delivered | failed | skipped
  error text null,
  provider text null,
  source text not null default 'system',        -- system | announcement
  source_ref text null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint notification_delivery_logs_pkey primary key (id),
  constraint notification_delivery_logs_notification_id_fkey
    foreign key (notification_id) references public.notifications (id) on delete set null,
  constraint notification_delivery_logs_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade
);
create index if not exists idx_delivery_logs_created
  on public.notification_delivery_logs using btree (created_at desc);
create index if not exists idx_delivery_logs_user
  on public.notification_delivery_logs using btree (user_id);
create index if not exists idx_delivery_logs_channel_status
  on public.notification_delivery_logs using btree (channel, status);

-- ---------------------------------------------------------------------
-- 8) push_subscriptions  (Web Push device tokens; 1 user -> banyak device)
-- ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null,
  keys jsonb not null,                          -- { p256dh, auth }
  user_agent text null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint push_subscriptions_pkey primary key (id),
  constraint push_subscriptions_user_endpoint_key unique (endpoint, user_id),
  constraint push_subscriptions_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade
);
create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions using btree (user_id);


-- =====================================================================
-- RLS
-- =====================================================================

-- notifications: read/update/delete milik sendiri. INSERT hanya service-role.
alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete using (user_id = auth.uid());

-- notification_preferences: CRUD milik sendiri
alter table public.notification_preferences enable row level security;
drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own" on public.notification_preferences
  for select using (user_id = auth.uid());
drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own" on public.notification_preferences
  for insert with check (user_id = auth.uid());
drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own" on public.notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notification_preferences_delete_own" on public.notification_preferences;
create policy "notification_preferences_delete_own" on public.notification_preferences
  for delete using (user_id = auth.uid());

-- notification_delivery_logs: read milik sendiri (admin baca via service-role)
alter table public.notification_delivery_logs enable row level security;
drop policy if exists "delivery_logs_select_own" on public.notification_delivery_logs;
create policy "delivery_logs_select_own" on public.notification_delivery_logs
  for select using (user_id = auth.uid());

-- templates & categories: read untuk authenticated (insert/update/delete service-role)
alter table public.notification_templates enable row level security;
drop policy if exists "notification_templates_read_authenticated" on public.notification_templates;
create policy "notification_templates_read_authenticated" on public.notification_templates
  for select to authenticated using (true);

alter table public.notification_categories enable row level security;
drop policy if exists "notification_categories_read_authenticated" on public.notification_categories;
create policy "notification_categories_read_authenticated" on public.notification_categories
  for select to authenticated using (true);

-- announcements: read untuk authenticated (manage oleh superadmin via service-role)
alter table public.announcements enable row level security;
drop policy if exists "announcements_read_authenticated" on public.announcements;
create policy "announcements_read_authenticated" on public.announcements
  for select to authenticated using (true);

-- announcement_targets: service-role only (tidak ada policy = deny utk non-service)
alter table public.announcement_targets enable row level security;

-- push_subscriptions: CRUD milik sendiri
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (user_id = auth.uid());
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (user_id = auth.uid());
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (user_id = auth.uid());


-- =====================================================================
-- Realtime publication (live unread count + inbox)
-- =====================================================================
do $$
begin
  begin alter publication supabase_realtime add table public.notifications; exception when others then null; end;
  begin alter publication supabase_realtime add table public.announcements; exception when others then null; end;
end $$;


-- =====================================================================
-- SEED — kategori & template sistem (idempoten)
-- =====================================================================

insert into public.notification_categories (id, label_key, description, default_channels, sort_order, is_system) values
('system',       'notifications.category.system',       'System & app-level alerts',         '{"in_app":true,"email":true,"push":false}'::jsonb, 0,  true),
('payment',      'notifications.category.payment',      'Payment events',                    '{"in_app":true,"email":true,"push":false}'::jsonb, 10, true),
('subscription', 'notifications.category.subscription', 'Subscription lifecycle',            '{"in_app":true,"email":true,"push":false}'::jsonb, 20, true),
('trial',        'notifications.category.trial',        'Trial reminders',                   '{"in_app":true,"email":true,"push":false}'::jsonb, 30, true),
('security',     'notifications.category.security',     'Security & account access',         '{"in_app":true,"email":true,"push":true }'::jsonb, 40, true),
('account',      'notifications.category.account',      'Account changes',                   '{"in_app":true,"email":true,"push":false}'::jsonb, 50, true),
('invitation',   'notifications.category.invitation',   'Tenant invitations',                '{"in_app":true,"email":true,"push":false}'::jsonb, 60, true),
('member',       'notifications.category.member',       'Membership changes',                '{"in_app":true,"email":true,"push":false}'::jsonb, 70, true),
('announcement', 'notifications.category.announcement', 'Admin announcements',               '{"in_app":true,"email":true,"push":false}'::jsonb, 80, true),
('marketing',    'notifications.category.marketing',    'Marketing & promotional',           '{"in_app":false,"email":true,"push":false}'::jsonb, 90, true)
on conflict (id) do nothing;

insert into public.notification_templates (id, category, title, body, channels, variables, is_enabled, is_system) values
('payment.success',
 'payment',
 '{"en":"Payment Successful","id":"Pembayaran Berhasil","ar":"تم الدفع بنجاح"}'::jsonb,
 '{"en":"Your payment has been received.","id":"Pembayaran Anda telah diterima.","ar":"تم استلام عملية الدفع الخاصة بك."}'::jsonb,
 array['in_app','email'],
 '{"amount":{"type":"string"},"plan":{"type":"string"},"invoice":{"type":"string"}}'::jsonb,
 true, true),
('payment.failed',
 'payment',
 '{"en":"Payment Failed","id":"Pembayaran Gagal","ar":"فشل الدفع"}'::jsonb,
 '{"en":"Your payment could not be processed. Please try again.","id":"Pembayaran Anda tidak dapat diproses. Silakan coba lagi.","ar":"تعذّر معالجة عملية الدفع الخاصة بك. يرجى المحاولة مرة أخرى."}'::jsonb,
 array['in_app','email'],
 '{"amount":{"type":"string"},"reason":{"type":"string"}}'::jsonb,
 true, true),
('subscription.activated',
 'subscription',
 '{"en":"Subscription Activated","id":"Langganan Diaktifkan","ar":"تم تفعيل الاشتراك"}'::jsonb,
 '{"en":"Your subscription is now active. Enjoy!","id":"Langganan Anda kini aktif. Nikmati!","ar":"اشتراكك الآن مفعّل. استمتع!"}'::jsonb,
 array['in_app','email'],
 '{"plan":{"type":"string"},"interval":{"type":"string"}}'::jsonb,
 true, true),
('subscription.expired',
 'subscription',
 '{"en":"Subscription Expired","id":"Langganan Berakhir","ar":"انتهى الاشتراك"}'::jsonb,
 '{"en":"Your subscription has expired. Renew to keep access.","id":"Langganan Anda telah berakhir. Perpanjang untuk tetap mendapatkan akses.","ar":"انتهى اشتراكك. جدّده للاحتفاظ بالوصول."}'::jsonb,
 array['in_app','email'],
 '{"plan":{"type":"string"}}'::jsonb,
 true, true),
('trial.ending',
 'trial',
 '{"en":"Trial Ending Soon","id":"Masa Uji Coba Segera Berakhir","ar":"تنتهي الفترة التجريبية قريبًا"}'::jsonb,
 '{"en":"Your trial ends in {{days}} days.","id":"Masa uji coba Anda berakhir dalam {{days}} hari.","ar":"تنتهي فترتك التجريبية خلال {{days}} أيام."}'::jsonb,
 array['in_app','email'],
 '{"days":{"type":"number"}}'::jsonb,
 true, true),
('password.changed',
 'security',
 '{"en":"Password Changed","id":"Kata Sandi Diubah","ar":"تم تغيير كلمة المرور"}'::jsonb,
 '{"en":"Your password was changed. If this wasn''t you, please secure your account.","id":"Kata sandi Anda telah diubah. Jika ini bukan Anda, amankan akun Anda.","ar":"تم تغيير كلمة المرور الخاصة بك. إذا لم تكن أنت، فأمّن حسابك."}'::jsonb,
 array['in_app','email','push'],
 '{}'::jsonb,
 true, true),
('email.verified',
 'account',
 '{"en":"Email Verified","id":"Email Terverifikasi","ar":"تم التحقق من البريد الإلكتروني"}'::jsonb,
 '{"en":"Your email address has been verified.","id":"Alamat email Anda telah diverifikasi.","ar":"تم التحقق من عنوان بريدك الإلكتروني."}'::jsonb,
 array['in_app','email'],
 '{}'::jsonb,
 true, true),
('login.new_device',
 'security',
 '{"en":"New Login Detected","id":"Login Baru Terdeteksi","ar":"تم رصد تسجيل دخول جديد"}'::jsonb,
 '{"en":"A new login from {{device}} was detected on {{time}}.","id":"Login baru dari {{device}} terdeteksi pada {{time}}.","ar":"تم رصد تسجيل دخول جديد من {{device}} في {{time}}."}'::jsonb,
 array['in_app','email','push'],
 '{"device":{"type":"string"},"time":{"type":"string"}}'::jsonb,
 true, true),
('invitation.received',
 'invitation',
 '{"en":"Tenant Invitation","id":"Undangan Tenant","ar":"دعوة انضمام"}'::jsonb,
 '{"en":"You''ve been invited to join {{tenant}} as {{role}}.","id":"Anda diundang bergabung ke {{tenant}} sebagai {{role}}.","ar":"لقد تمت دعوتك للانضمام إلى {{tenant}} بدور {{role}}."}'::jsonb,
 array['in_app','email'],
 '{"tenant":{"type":"string"},"role":{"type":"string"}}'::jsonb,
 true, true),
('member.removed',
 'member',
 '{"en":"Removed from Tenant","id":"Dikeluarkan dari Tenant","ar":"تمت إزالتك من المؤسسة"}'::jsonb,
 '{"en":"You were removed from {{tenant}}.","id":"Anda dikeluarkan dari {{tenant}}.","ar":"تمت إزالتك من {{tenant}}."}'::jsonb,
 array['in_app','email'],
 '{"tenant":{"type":"string"}}'::jsonb,
 true, true)
on conflict (id) do nothing;
