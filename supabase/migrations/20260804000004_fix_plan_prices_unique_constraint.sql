-- Fix plan_prices unique constraint
-- Masalah: ada unique constraint terpisah pada plan_id dan interval secara sendiri-sendiri,
-- tapi ON CONFLICT(plan_id, interval) butuh composite unique constraint.

-- Hapus constraint per-kolom yang tidak tepat
ALTER TABLE public.plan_prices DROP CONSTRAINT IF EXISTS plan_prices_plan_id_key;
ALTER TABLE public.plan_prices DROP CONSTRAINT IF EXISTS plan_prices_interval_key;

-- Tambah composite unique constraint yang benar untuk mendukung upsert ON CONFLICT(plan_id, interval)
ALTER TABLE public.plan_prices
  ADD CONSTRAINT plan_prices_plan_id_interval_key UNIQUE (plan_id, "interval");
