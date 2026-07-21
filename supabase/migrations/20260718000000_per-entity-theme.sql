-- Per-entity theme settings: profiles.theme + tenants.theme (JSONB).
-- Resolusi: profiles.theme ?? tenants.theme ?? DEFAULT_THEME.
-- Prioritas: user punya tema sendiri → pakai sendiri; jika tidak → ikut tenant;
-- jika tenant juga default → pakai app default.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;
