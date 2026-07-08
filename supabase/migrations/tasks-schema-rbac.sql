-- ===============================================================
-- TASKS — Expand skema + RLS + RBAC seed
-- Jalankan di Supabase SQL Editor (urut dari atas ke bawah).
--
-- PENTING — lokasi tabel tasks:
--   Tabel `tasks` BUKAN di schema `public`. Tabel data tenant berada
--   di schema terpisah sesuai model multi-tenant:
--     - SHARED   -> tenant_shared.tasks  (punya kolom tenant_id)
--     - ISOLATED -> tenant_<subdomain>.tasks
--   Tabel inti (memberships, profiles, roles, permissions) tetap di
--   `public`. File ini menarget SHARED (tenant_shared.tasks).
--   Untuk ISOLATED, ganti `tenant_shared` -> `tenant_<subdomain>`
--   untuk setiap tenant yang sudah ada (lihat catatan akhir file).
--
-- Prasyarat:
--   - schema tenant_shared + tabel tenant_shared.tasks sudah ada
--     (kolom minimal: id, tenant_id, title, created_at)
--   - fungsi RLS helper public.is_tenant_member / is_tenant_admin
--     sudah ada (lihat rbac-rls-fix.sql). Fungsi tsb security definer
--     dgn search_path=public sehingga AMAN dipanggil dari policy pada
--     schema tenant_shared.
-- Semua tambahan non-destructive (add column if not exists).
-- ===============================================================

-- ---------------------------------------------------------------
-- 0. Grant USAGE + DML pada schema tenant_shared ke role anon/authenticated
--    PENTING: Supabase hanya menambahkan schema ke "Exposed schemas"
--    PostgREST; ia TIDAK otomatis memberi privilege USAGE/DML ke role
--    anon/authenticated untuk schema non-public. Tanpa ini:
--      "permission denied for schema tenant_shared"
--    RLS tetap membatasi baris yang boleh diakses (lihat bagian 3).
-- ---------------------------------------------------------------
grant usage on schema tenant_shared to anon, authenticated;
grant select, insert, update, delete on tenant_shared.tasks to anon, authenticated;

-- Tabel baru di schema ini otomatis dapat privilege anon/authenticated.
alter default privileges in schema tenant_shared
  grant select, insert, update, delete on tables to anon, authenticated;

-- ---------------------------------------------------------------
-- 1. Expand tenant_shared.tasks
--    Kolom user_id lama dibiarkan (nullable, tidak dipakai).
--    Assignee & creator -> profiles(id) di schema public.
-- ---------------------------------------------------------------
alter table tenant_shared.tasks
  add column if not exists description text,
  add column if not exists status text not null default 'todo',
  add column if not exists priority text not null default 'medium',
  add column if not exists due_date timestamptz,
  add column if not exists assignee_id uuid references public.profiles(id) on delete set null,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill updated_at untuk baris lama
update tenant_shared.tasks set updated_at = coalesce(created_at, now()) where updated_at is null;

-- CHECK constraints
alter table tenant_shared.tasks drop constraint if exists tasks_status_check;
alter table tenant_shared.tasks
  add constraint tasks_status_check
  check (status in ('todo', 'in_progress', 'done', 'cancelled'));

alter table tenant_shared.tasks drop constraint if exists tasks_priority_check;
alter table tenant_shared.tasks
  add constraint tasks_priority_check
  check (priority in ('low', 'medium', 'high', 'urgent'));

-- ---------------------------------------------------------------
-- 2. Trigger updated_at (fungsi generik di public, dipakai banyak tabel)
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tasks_set_updated_at on tenant_shared.tasks;
create trigger trg_tasks_set_updated_at
  before update on tenant_shared.tasks
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- 3. RLS policies pada tenant_shared.tasks
--    Member bisa baca semua task org & insert.
--    Update: admin/owner ATAU pemilik (assignee/creator).
--    Delete: admin/owner saja.
--    (Defense-in-depth; app code juga gate via requirePermission.)
-- ---------------------------------------------------------------
alter table tenant_shared.tasks enable row level security;

drop policy if exists "tasks_select_tenant_member" on tenant_shared.tasks;
create policy "tasks_select_tenant_member"
  on tenant_shared.tasks for select
  to authenticated
  using (public.is_tenant_member(tenant_id));

drop policy if exists "tasks_insert_tenant_member" on tenant_shared.tasks;
create policy "tasks_insert_tenant_member"
  on tenant_shared.tasks for insert
  to authenticated
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tasks_update_admin_or_owner" on tenant_shared.tasks;
create policy "tasks_update_admin_or_owner"
  on tenant_shared.tasks for update
  to authenticated
  using (
    public.is_tenant_admin(tenant_id)
    or assignee_id = auth.uid()
    or created_by = auth.uid()
  )
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tasks_delete_admin" on tenant_shared.tasks;
create policy "tasks_delete_admin"
  on tenant_shared.tasks for delete
  to authenticated
  using (public.is_tenant_admin(tenant_id));

-- ---------------------------------------------------------------
-- 4. RBAC seed — tambah 4 permission + grant per role
--    (tabel permissions & role_permissions ADA di schema public)
--    Nama HARUS identik 1:1 dgn PERMISSIONS di lib/rbac/permissions.ts
-- ---------------------------------------------------------------
insert into public.permissions (name, description) values
  ('tasks.read',   'View tasks in the organization'),
  ('tasks.create', 'Create a new task in the organization'),
  ('tasks.update', 'Update any task in the organization'),
  ('tasks.delete', 'Delete tasks in the organization')
on conflict (name) do update set description = excluded.description;

-- Member = baca semua task + buat task
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.name = 'Member'
  and p.name in ('tasks.read', 'tasks.create')
on conflict do nothing;

-- Admin = + update & delete semua task
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.name = 'Admin'
  and p.name in ('tasks.update', 'tasks.delete')
on conflict do nothing;

-- Owner = semua permission tasks (idempoten)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.name = 'Owner'
  and p.name in ('tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete')
  and not exists (
    select 1 from public.role_permissions rp
    where rp.role_id = r.id and rp.permission_id = p.id
  );

-- ---------------------------------------------------------------
-- 5. UNTUK TENANT ISOLATED (opsional, per tenant)
--    Ganti `tenant_shared` -> `tenant_<subdomain>` lalu jalankan
--    ulang bagian 1-3 untuk setiap schema tenant_<subdomain> yang
--    sudah ada. (Bagian 4 permission seed cukup sekali.)
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- 6. (VERIFIKASI) Ringkasan grants tasks
--    Owner = 4, Admin = 2, Member = 2 (di atas grants domain lain)
-- ---------------------------------------------------------------
-- select r.name, count(rp.permission_id) as task_perms
-- from public.roles r
-- left join public.role_permissions rp on rp.role_id = r.id
-- left join public.permissions p on p.id = rp.permission_id
-- where p.name like 'tasks.%'
-- group by r.name
-- order by r.hierarchy_level desc;
