-- 20260724000000_plans-billing-features.sql
--
-- Fitur plans/billing baru:
--   - plans: is_enterprise, is_recommended, trial_days
--   - subscriptions: user_id + relaksasi unique(tenant_id) agar support scope user
--   - enterprise_inquiries: tabel form contact-enterprise

-- plans: atribut baru
alter table plans add column if not exists is_enterprise  boolean not null default false;
alter table plans add column if not exists is_recommended boolean not null default false;
alter table plans add column if not exists trial_days     integer not null default 0;

-- subscriptions: dukungan scope user (billingAttachedTo = "user")
alter table subscriptions add column if not exists user_id uuid;
-- Relaksasi unique(tenant_id): izinkan baris scope-user (tenant_id nullable) &
-- baris scope-tenant (user_id null). Satu subscription aktif per owner.
alter table subscriptions drop constraint if exists subscriptions_tenant_id_key;
create unique index if not exists subscriptions_tenant_unique on subscriptions (tenant_id) where user_id is null;
create unique index if not exists subscriptions_user_unique   on subscriptions (user_id)   where user_id is not null;

-- enterprise contact submissions (form "Hubungi Kami" pada plan enterprise)
create table if not exists public.enterprise_inquiries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  user_id uuid,
  plan_id text not null,
  name text,
  email text,
  message text,
  status text not null default 'new',          -- new | contacted | closed
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists enterprise_inquiries_status_idx on public.enterprise_inquiries (status);
