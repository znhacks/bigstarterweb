-- Fix Security Advisor Warning: View public.tasks unrestricted
-- Mengatur security_invoker = true pada view public.tasks agar mengeksekusi RLS
-- pada tabel dasar tenant_shared.tasks menggunakan identitas pengguna yang melakukan kueri.

ALTER VIEW public.tasks SET (security_invoker = true);
