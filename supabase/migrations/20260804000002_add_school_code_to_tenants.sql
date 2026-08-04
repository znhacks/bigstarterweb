-- Migration file: Add school_code column to public.tenants
-- Digunakan untuk menghubungkan tenant sekolah di JM-Panel dengan kode sekolah pada DB Jurnal Mengajar.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS school_code VARCHAR(100);
