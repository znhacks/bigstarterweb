-- ===============================================================
-- RBAC RLS FIX — WAJIB DIJALANKAN PERTAMA
-- ===============================================================
-- Masalah: fungsi RLS helper (is_tenant_owner, is_tenant_admin,
-- is_tenant_admin_only) masih referensi kolom `memberships.role`
-- yang SUDAH TIDAK ADA (skema sekarang pakai `role_id` FK).
--
-- Karena policy "Mengelola keanggotaan" adalah `for all` dan
-- memanggil is_tenant_admin(), setiap query membership (termasuk
-- SELECT) ikut error: "column role does not exist".
--
-- File ini mendefinisikan ulang fungsi-fungsi tsb agar memeriksa
-- role melalui join `memberships.role_id → roles` berdasarkan nama
-- role (case-insensitive). Jalankan di Supabase SQL Editor.
-- ===============================================================

-- Owner: role bernama 'owner' (case-insensitive)
create or replace function public.is_tenant_owner(_tenant_id uuid)
returns boolean
security definer
set search_path = public
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships m
    join public.roles r on r.id = m.role_id
    where m.user_id = auth.uid()
      and m.tenant_id = _tenant_id
      and lower(r.name) = 'owner'
  );
$$;

-- Admin saja: role bernama 'admin'
create or replace function public.is_tenant_admin_only(_tenant_id uuid)
returns boolean
security definer
set search_path = public
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships m
    join public.roles r on r.id = m.role_id
    where m.user_id = auth.uid()
      and m.tenant_id = _tenant_id
      and lower(r.name) = 'admin'
  );
$$;

-- Member: cukup ada baris membership (tidak bergantung role). Tetap.
create or replace function public.is_tenant_member(_tenant_id uuid)
returns boolean
security definer
set search_path = public
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships
    where user_id = auth.uid()
      and tenant_id = _tenant_id
  );
$$;

-- Admin atau Owner: role bernama 'admin' / 'owner'
create or replace function public.is_tenant_admin(_tenant_id uuid)
returns boolean
security definer
set search_path = public
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships m
    join public.roles r on r.id = m.role_id
    where m.user_id = auth.uid()
      and m.tenant_id = _tenant_id
      and lower(r.name) in ('admin', 'owner')
  );
$$;

-- ===============================================================
-- RLS read policies untuk tabel katalog RBAC (global, aman dibaca).
-- Diperlukan agar nested select `roles(role_permissions(permissions(name)))`
-- via klien user (kena RLS) mengembalikan data, bukan kosong.
-- Semua write tetap lewat service role (server actions) yang bypass RLS.
-- ===============================================================
alter table public.roles enable row level security;
drop policy if exists "Authenticated dapat membaca roles" on public.roles;
create policy "Authenticated dapat membaca roles"
on public.roles for select
to authenticated
using (true);

alter table public.permissions enable row level security;
drop policy if exists "Authenticated dapat membaca permissions" on public.permissions;
create policy "Authenticated dapat membaca permissions"
on public.permissions for select
to authenticated
using (true);

alter table public.role_permissions enable row level security;
drop policy if exists "Authenticated dapat membaca role_permissions" on public.role_permissions;
create policy "Authenticated dapat membaca role_permissions"
on public.role_permissions for select
to authenticated
using (true);
