-- =====================================================================
-- Address cascade: RLS read-only utk tabel referensi lokasi +
-- kolom kecamatan/desa di profiles & tenants.
-- =====================================================================

-- 1. RLS read-only (anon + authenticated) utk tabel geo.
--    Tulis tetap service-role (lihat rbac-rls-fix.sql pola serupa).
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kecamatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read countries" ON public.countries;
CREATE POLICY "public read countries" ON public.countries
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read states" ON public.states;
CREATE POLICY "public read states" ON public.states
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read cities" ON public.cities;
CREATE POLICY "public read cities" ON public.cities
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read kecamatan" ON public.kecamatan;
CREATE POLICY "public read kecamatan" ON public.kecamatan
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read desa" ON public.desa;
CREATE POLICY "public read desa" ON public.desa
  FOR SELECT TO anon, authenticated USING (true);

-- 2. Kolom kecamatan & desa
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_kecamatan text,
  ADD COLUMN IF NOT EXISTS address_desa text;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS kecamatan text,
  ADD COLUMN IF NOT EXISTS desa text;
