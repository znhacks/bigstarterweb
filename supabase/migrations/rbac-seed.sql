-- ===============================================================
-- RBAC Seed & Backfill
-- Jalankan di Supabase SQL Editor (urut dari atas ke bawah).
-- Prasyarat (sudah kamu atur di Supabase Cloud):
--   - tabel roles, permissions, role_permissions sudah ada
--   - memberships.role_id & invitations.role_id (FK → roles.id) sudah ada
--   - RLS sudah dikonfigurasi
-- File ini men-seed data roles/permissions/role_permissions dan mengisi
-- role_id NULL. Skema tidak memiliki kolom role string.
-- CATATAN PENTING: jalankan `rbac-rls-fix.sql` lebih dulu agar fungsi RLS
-- tidak lagi mereferensikan kolom role yang tidak ada.
-- ===============================================================

-- ---------------------------------------------------------------
-- 1. Seed 3 role dasar (hierarchy makin besar makin berkuasa)
--    Gap besar (100/50/10) menyisakan ruang utk role antara.
-- ---------------------------------------------------------------
insert into public.roles (name, hierarchy_level) values
  ('Owner', 100),
  ('Admin', 50),
  ('Member', 10)
on conflict (name) do update set hierarchy_level = excluded.hierarchy_level;

-- ---------------------------------------------------------------
-- 2. Seed katalog permission (format domain.action)
--    Nama di bawah HARUS identik dgn PERMISSIONS di lib/rbac/permissions.ts
-- ---------------------------------------------------------------
insert into public.permissions (name, description) values
  ('organization.read',   'View organization settings and profile'),
  ('organization.update', 'Edit organization name, logo, and settings'),
  ('organization.delete', 'Delete the organization'),
  ('members.read',        'View the member list and pending invitations'),
  ('members.invite',      'Invite new members to the organization'),
  ('members.manage',      "Change a member's role"),
  ('members.remove',      'Remove a member from the organization'),
  ('billing.read',        'View invoices, plan, and subscription status'),
  ('billing.manage',      'Change plan, update payment, manage subscription'),
  ('api_keys.manage',     'Create, rotate, and revoke API keys'),
  ('dashboard.view',      'Access the organization dashboard'),
  ('settings.view',       'Access account & settings pages')
on conflict (name) do update set description = excluded.description;

-- ---------------------------------------------------------------
-- 3. Seed role_permissions (grants per role)
--    Member = read-only lintas domain + dashboard
--    Admin  = writes operasional (tanpa delete-org)
--    Owner  = semua permission
-- ---------------------------------------------------------------
-- Member
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.name = 'Member'
  and p.name in (
    'organization.read', 'members.read', 'billing.read',
    'dashboard.view', 'settings.view'
  )
on conflict do nothing;

-- Admin
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.name = 'Admin'
  and p.name in (
    'organization.update', 'members.invite', 'members.manage', 'members.remove',
    'billing.manage', 'api_keys.manage'
  )
on conflict do nothing;

-- Owner = semua permission (idempoten)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.name = 'Owner'
  and not exists (
    select 1 from public.role_permissions rp
    where rp.role_id = r.id and rp.permission_id = p.id
  );

-- ---------------------------------------------------------------
-- 4. Isi role_id untuk baris yang masih NULL.
--    Skema TIDAK punya kolom role string (hanya role_id), jadi tidak
--    ada sumber backfill otomatis. Default: role "Member". Promosikan
--    Owner sebenarnya secara manual setelah ini bila perlu.
-- ---------------------------------------------------------------
update public.memberships
set role_id = (select id from public.roles where lower(name) = 'member' limit 1)
where role_id is null;

update public.invitations
set role_id = (select id from public.roles where lower(name) = 'member' limit 1)
where role_id is null;

-- ---------------------------------------------------------------
-- 5. (VERIFIKASI) Cek baris yang masih NULL.
--    Jalankan kedua query di bawah; PASTIKAN return 0 baris.
-- ---------------------------------------------------------------
-- select id from public.memberships where role_id is null;
-- select id from public.invitations  where role_id is null;

-- ---------------------------------------------------------------
-- 6. Set NOT NULL (jalankan HANYA setelah langkah 5 return 0 baris)
-- ---------------------------------------------------------------
-- alter table public.memberships alter column role_id set not null;
-- alter table public.invitations  alter column role_id set not null;

-- ---------------------------------------------------------------
-- 7. Ringkasan grants (utk verifikasi cepat)
--    Owner = 12, Admin = 6, Member = 5
-- ---------------------------------------------------------------
-- select r.name, count(rp.permission_id) as perms
-- from public.roles r
-- left join public.role_permissions rp on rp.role_id = r.id
-- group by r.name
-- order by r.hierarchy_level desc;
