-- 20260725000000_billing-grant-and-schema-fix.sql
--
-- Memperbaiki bug "subscription tidak pernah ter-update" + perubahan skema billing.
--
-- AKAR MASALAH GRANT: migrasi 20260724 mengganti unique(tenant_id) plain dgn PARTIAL
-- unique index `where user_id is null`. Akibatnya `ON CONFLICT (tenant_id)` (Supabase upsert
-- onConflict:"tenant_id") tidak bisa menyimpulkan index yg dipakai → error → grant gagal
-- di semua provider. Di Postgres unique PLAIN sudah memperlakukan NULL sebagai distinct,
-- jadi unique(tenant_id) + unique(user_id) plain cukup untuk mode tenant & user.

-- === BAGIAN 1: kembalikan unique PLAIN (fix grant) — PRIORITAS ===
drop index if exists subscriptions_tenant_unique;
drop index if exists subscriptions_user_unique;
create unique index if not exists subscriptions_tenant_id_key on subscriptions (tenant_id);
create unique index if not exists subscriptions_user_id_key   on subscriptions (user_id);

-- === BAGIAN 4: plan_prices.product_id tunggal (menggantikan provider_ids array) ===
alter table plan_prices add column if not exists product_id text;

-- === BAGIAN 5: transactions.plan_id (FK) + plan_name jadi nullable snapshot ===
alter table transactions add column if not exists plan_id text;
alter table transactions alter column plan_name drop not null;

-- === BAGIAN 6: FK plan_id -> plans(id)
--   NOT VALID: skip pengecekan data lama (menghindari kegagalan bila ada baris lama dgn
--   plan_id "free"/"unknown" yg tidak punya pasangan di plans). Penulisan baru tetap di-enforce.
--   Semua ON DELETE SET NULL agar hapus plan tak menghancurkan data & tidak memblok grant.
alter table transactions   drop constraint if exists transactions_plan_id_fkey;
alter table transactions   add constraint transactions_plan_id_fkey   foreign key (plan_id) references plans(id) on delete set null not valid;

alter table subscriptions  drop constraint if exists subscriptions_plan_id_fkey;
alter table subscriptions  add constraint subscriptions_plan_id_fkey  foreign key (plan_id) references plans(id) on delete set null not valid;

alter table payment_orders drop constraint if exists payment_orders_plan_id_fkey;
alter table payment_orders add constraint payment_orders_plan_id_fkey foreign key (plan_id) references plans(id) on delete set null not valid;
