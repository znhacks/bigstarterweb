-- =====================================================================
-- Billing tables baseline (reproducibility)
-- Tabel billing dibuat langsung di dashboard Supabase; migrasi ini
-- men-track DDL-nya agar DB fresh bisa direprovisi dari repo.
-- Idempoten: CREATE TABLE IF NOT EXISTS (tidak mengubah tabel yg sudah ada).
-- Kolom tambahan (interval, tax/net/fee) & RPC ada di 20260714000000_billing-hardening.sql
-- =====================================================================

create table if not exists public.plans (
  id text not null,
  name text not null,
  description text not null,
  is_active boolean not null default true,
  display_features text[] not null default '{}'::text[],
  features text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint plans_pkey primary key (id)
);
create index if not exists idx_plans_is_active on public.plans using btree (is_active);

create table if not exists public.plan_prices (
  id uuid not null default gen_random_uuid(),
  plan_id text not null,
  interval text not null,
  amount numeric(10, 2) not null,
  provider_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint plan_prices_pkey primary key (id),
  constraint plan_prices_plan_interval_unique unique (plan_id, "interval"),
  constraint plan_prices_plan_id_fkey foreign key (plan_id) references public.plans (id) on delete cascade
);
create index if not exists idx_plan_prices_plan_id on public.plan_prices using btree (plan_id);

create table if not exists public.subscriptions (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  plan_id text null,
  status text not null,
  cancel_at_period_end boolean null default false,
  starts_at timestamptz not null default timezone('utc'::text, now()),
  ends_at timestamptz null,
  provider_subscription_id text null,
  provider_customer_id text null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  provider text null,
  pending_plan_id text null,
  interval text null,
  constraint subscriptions_pkey primary key (id),
  constraint subscriptions_tenant_id_key unique (tenant_id),
  constraint subscriptions_tenant_id_fkey foreign key (tenant_id) references public.tenants (id) on delete cascade
);
create index if not exists idx_subscriptions_provider on public.subscriptions using btree (provider);

create table if not exists public.transactions (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  amount numeric(10, 2) not null,
  currency text null default 'USD'::text,
  plan_name text not null,
  order_id text not null,
  status text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  provider text null,
  amount_in_idr numeric(10, 2) null,
  exchange_rate numeric(10, 4) null,
  exchange_api_used text null,
  tax_amount numeric(10, 2) null default 0,
  net_amount numeric(10, 2) null default 0,
  fee_amount numeric(10, 2) null default 0,
  constraint transactions_pkey primary key (id),
  constraint transactions_order_id_key unique (order_id),
  constraint transactions_tenant_id_fkey foreign key (tenant_id) references public.tenants (id) on delete cascade
);
create index if not exists idx_transactions_provider on public.transactions using btree (provider);

create table if not exists public.coupons (
  id uuid not null default gen_random_uuid(),
  code text not null,
  discount_type text not null,
  discount_value numeric(10, 2) not null,
  valid_until timestamptz null,
  max_redemptions integer null,
  redeemed_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint coupons_pkey primary key (id)
);
-- Uniqueness case-insensitive (mixed-case/Unicode) — lihat hardening migration.
create unique index if not exists coupons_code_lower_uniq on public.coupons (lower(code));

create table if not exists public.coupon_redemptions (
  id uuid not null default gen_random_uuid(),
  coupon_id uuid not null,
  tenant_id uuid not null,
  redeemed_at timestamptz not null default timezone('utc'::text, now()),
  constraint coupon_redemptions_pkey primary key (id),
  constraint coupon_redemptions_coupon_tenant_unique unique (coupon_id, tenant_id),
  constraint coupon_redemptions_coupon_id_fkey foreign key (coupon_id) references public.coupons (id) on delete cascade,
  constraint coupon_redemptions_tenant_id_fkey foreign key (tenant_id) references public.tenants (id) on delete cascade
);
