-- =====================================================================
-- Settings fields: tambah field umum (description, phone, website) +
-- formalisasi kolom tenant yg sudah hidup di DB tapi tak ter-track di repo.
-- Idempoten: ADD COLUMN IF NOT EXISTS.
-- =====================================================================

-- profiles (users): description (bio) + phone
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS phone text;

-- tenants: description + website + formalisasi kolom settings yg sudah hidup
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state_province text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS business_email text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS default_locale text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS currency text;
