-- ===============================================================
-- SOFT-DELETE + BANNED/SUSPEND untuk profiles & tenants
-- Jalankan di Supabase SQL Editor (urut dari atas ke bawah).
--
-- Menambahkan:
--   profiles: deleted_at, status ('active'|'deleted'|'banned'),
--             banned_until, banned_reason
--   tenants:  deleted_at, status ('active'|'deleted')
-- Dan memperbarui policy SELECT agar mengecualikan baris soft-deleted.
-- Superadmin (service role) bypass RLS → tetap bisa lihat deleted (utk
-- UI restore/ban).
-- Non-destructive (add column if not exists).
-- ===============================================================

-- ---------------------------------------------------------------
-- 1. Kolom soft-delete & ban
-- ---------------------------------------------------------------
alter table public.profiles
  add column if not exists deleted_at timestamptz,
  add column if not exists status text not null default 'active',
  add column if not exists banned_until timestamptz,
  add column if not exists banned_reason text;

alter table public.tenants
  add column if not exists deleted_at timestamptz,
  add column if not exists status text not null default 'active';

-- Backfill status lama -> active
update public.profiles
  set status = 'active'
  where status is null or status not in ('active', 'deleted', 'banned');
update public.tenants
  set status = 'active'
  where status is null;

-- Index bantu filter
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_deleted_at_idx on public.profiles (deleted_at);
create index if not exists tenants_deleted_at_idx on public.tenants (deleted_at);

-- CHECK opsional agar status profile valid
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='profiles' and constraint_name='profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check check (status in ('active','deleted','banned'));
  end if;
end $$;

-- ---------------------------------------------------------------
-- 2. RLS SELECT: sembunyikan baris soft-deleted dari role anon/authenticated.
--    (Superadmin/service role bypass RLS -> tetap lihat utk restore/ban.)
--    Nama policy sesuai yg ada di DB; drop+recreate dgn filter deleted_at.
-- ---------------------------------------------------------------

-- profiles: "User dapat melihat profil sendiri dan rekan tim"
drop policy if exists "User dapat melihat profil sendiri dan rekan tim" on public.profiles;
create policy "User dapat melihat profil sendiri dan rekan tim"
  on public.profiles for select
  to authenticated
  using (
    deleted_at is null
    and (
      id = auth.uid()
      or exists (
        select 1
        from memberships m1
        join memberships m2 on m1.tenant_id = m2.tenant_id
        where m1.user_id = auth.uid() and m2.user_id = profiles.id
      )
    )
  );

-- tenants: "Superadmin atau anggota tenant dapat melihat"
drop policy if exists "Superadmin atau anggota tenant dapat melihat" on public.tenants;
create policy "Superadmin atau anggota tenant dapat melihat"
  on public.tenants for select
  to authenticated
  using (deleted_at is null and (public.is_superadmin() or public.is_tenant_member(id)));

-- tenants: "Anggota dapat melihat detail tenant"
drop policy if exists "Anggota dapat melihat detail tenant" on public.tenants;
create policy "Anggota dapat melihat detail tenant"
  on public.tenants for select
  to authenticated
  using (deleted_at is null and public.is_tenant_member(id));

-- Catatan: policy SELECT lain (insert/update/delete pada profiles/tenants)
-- tidak diubah; soft-delete memakai UPDATE (bukan DELETE) sehingga policy
-- UPDATE yg sudah ada cukup. Bila perlu, tambahkan klausa deleted_at pada
-- policy UPDATE sesuai kebutuhan.
