-- 20260724000001_rls-billing-rbac-tables.sql
--
-- KEAMANAN: Enable Row Level Security pada tabel billing/RBAC di schema `public`
-- yang sebelumnya TIDAK memiliki RLS:
--   coupons, coupon_redemptions, payment_orders, enterprise_inquiries
--
-- Mengapa ini kritis: Supabase secara default memberi role `anon`/`authenticated`
-- hak SELECT/INSERT/UPDATE/DELETE penuh ke tabel `public` saat RLS mati. Tanpa
-- policy, filter `.eq('tenant_id', ...)` di sisi aplikasi bisa dilewati dengan
-- PostgREST langsung → bocor data lintas-tenant / takeover org.
--
-- Aplikasi membaca/menulis tabel ini via SERVICE ROLE (bypass RLS), jadi
-- meng-enable RLS di sini HANYA mengunci akses anon/authenticated langsung —
-- aplikasi tetap berjalan normal. Fungsi `is_superadmin()` dan
-- `is_tenant_member(tenant_id)` sudah ada (dipakai policy lain).

-- ============================================================================
-- coupons  (GLOBAL — tidak ada tenant_id; berisi kode & nilai diskon)
-- Baca/tulis hanya Superadmin. Aplikasi memvalidasi kupon via service-role.
-- ============================================================================
alter table public.coupons enable row level security;

drop policy if exists "coupons_superadmin_all" on public.coupons;
create policy "coupons_superadmin_all" on public.coupons
  for all to authenticated
  using (is_superadmin())
  with check (is_superadmin());

-- ============================================================================
-- coupon_redemptions  (tenant-scoped; ditulis via RPC redeem_coupon SECURITY DEFINER)
-- Baca oleh anggota tenant / superadmin. Tidak ada policy write untuk
-- anon/authenticated → insert/update/delete langsung ditolak (fail-closed).
-- ============================================================================
alter table public.coupon_redemptions enable row level security;

drop policy if exists "coupon_redemptions_tenant_read" on public.coupon_redemptions;
create policy "coupon_redemptions_tenant_read" on public.coupon_redemptions
  for select to authenticated
  using (is_superadmin() or is_tenant_member(tenant_id));

-- ============================================================================
-- payment_orders  (tenant + user scoped; ditulis oleh checkout/webhook service-role)
-- Baca oleh anggota tenant / pemilik order / superadmin.
-- ============================================================================
alter table public.payment_orders enable row level security;

drop policy if exists "payment_orders_tenant_read" on public.payment_orders;
create policy "payment_orders_tenant_read" on public.payment_orders
  for select to authenticated
  using (is_superadmin() or is_tenant_member(tenant_id) or user_id = auth.uid());

-- ============================================================================
-- enterprise_inquiries  (tenant + user scoped; PII nama/email/pesan)
-- Baca oleh pengirim / anggota tenant / superadmin. Tulis hanya via service-role.
-- ============================================================================
alter table public.enterprise_inquiries enable row level security;

drop policy if exists "enterprise_inquiries_tenant_read" on public.enterprise_inquiries;
create policy "enterprise_inquiries_tenant_read" on public.enterprise_inquiries
  for select to authenticated
  using (is_superadmin() or is_tenant_member(tenant_id) or user_id = auth.uid());

-- ============================================================================
-- Catatan: subscriptions, transactions, memberships, invitations, plans,
-- plan_prices, profiles, tenants, api_keys(tenant_shared), tasks(tenant_shared)
-- sudah memiliki RLS + policy yang benar (diverifikasi via pg_policies).
-- ============================================================================
