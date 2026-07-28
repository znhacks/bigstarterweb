-- 20260728000000_contact-subject.sql
-- Tambah kolom subject ke enterprise_inquiries (reusable untuk contact umum).
alter table public.enterprise_inquiries add column if not exists subject text;
