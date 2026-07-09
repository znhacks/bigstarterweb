-- address-columns.sql
-- Menambahkan kolom-kolom alamat baru pada tabel public.profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS address_line1 text,
ADD COLUMN IF NOT EXISTS address_line2 text,
ADD COLUMN IF NOT EXISTS address_city text,
ADD COLUMN IF NOT EXISTS address_region text,
ADD COLUMN IF NOT EXISTS address_postal_code text,
ADD COLUMN IF NOT EXISTS address_country text;

-- Opsional: Berikan akses deskripsi komentar kolom agar rapi
COMMENT ON COLUMN public.profiles.address_line1 IS 'Baris alamat utama';
COMMENT ON COLUMN public.profiles.address_line2 IS 'Baris alamat tambahan seperti nomor apartemen, suite, dll.';
COMMENT ON COLUMN public.profiles.address_city IS 'Kota atau Kabupaten';
COMMENT ON COLUMN public.profiles.address_region IS 'Provinsi atau Negara Bagian';
COMMENT ON COLUMN public.profiles.address_postal_code IS 'Kode Pos / ZIP Code';
COMMENT ON COLUMN public.profiles.address_country IS 'Kode ISO-3166 alpha-2 Negara';