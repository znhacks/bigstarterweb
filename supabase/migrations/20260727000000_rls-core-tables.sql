-- 20260727000000_rls-core-tables.sql
--
-- RLS policies inti (tenants/memberships/invitations/subscriptions/transactions/
-- plans/plan_prices/api_keys/profiles) yang sebelumnya HANYA ada di DB live, kini
-- di-track di VCS. Pakai helper di rbac-rls-fix.sql: is_tenant_member/is_tenant_admin/
-- is_tenant_owner/is_superadmin. Idempoten (drop policy if exists + create).
--
-- CATATAN: ini policy yg DIMAKSUD utk boilerplate. Bila DB live Anda punya policy
-- dgn nama/ekspresi berbeda, policy tsb TETAP berlaku (Postgres OR-kan policy
-- permissive). Reconcile: drop policy lama di DB live bila ingin versi VCS otoritatif.
-- Webhook/billing pakai service-role (bypass RLS) → INSERT/UPDATE via service-role aman.

-- ============ tenants (SELECT sudah di soft-delete.sql; tambah UPDATE/DELETE) ============
alter table public.tenants enable row level security;

drop policy if exists "tenants_update_admin_or_owner" on public.tenants;
create policy "tenants_update_admin_or_owner" on public.tenants
  for update to authenticated
  using (public.is_tenant_admin(id) or public.is_superadmin())
  with check (public.is_tenant_admin(id) or public.is_superadmin());

drop policy if exists "tenants_delete_owner_or_superadmin" on public.tenants;
create policy "tenants_delete_owner_or_superadmin" on public.tenants
  for delete to authenticated
  using (public.is_superadmin() or public.is_tenant_owner(id));

-- ============ memberships ============
alter table public.memberships enable row level security;

drop policy if exists "memberships_select_tenant_member" on public.memberships;
create policy "memberships_select_tenant_member" on public.memberships
  for select to authenticated using (public.is_tenant_member(tenant_id));

drop policy if exists "memberships_insert_admin" on public.memberships;
create policy "memberships_insert_admin" on public.memberships
  for insert to authenticated
  with check (public.is_tenant_admin(tenant_id));

drop policy if exists "memberships_update_admin" on public.memberships;
create policy "memberships_update_admin" on public.memberships
  for update to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

drop policy if exists "memberships_delete_admin" on public.memberships;
create policy "memberships_delete_admin" on public.memberships
  for delete to authenticated using (public.is_tenant_admin(tenant_id));

-- ============ invitations ============
alter table public.invitations enable row level security;

drop policy if exists "invitations_select_tenant_member" on public.invitations;
create policy "invitations_select_tenant_member" on public.invitations
  for select to authenticated using (public.is_tenant_member(tenant_id));

drop policy if exists "invitations_write_admin" on public.invitations;
create policy "invitations_write_admin" on public.invitations
  for all to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- ============ subscriptions ============
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_tenant_member" on public.subscriptions;
create policy "subscriptions_select_tenant_member" on public.subscriptions
  for select to authenticated using (public.is_tenant_member(tenant_id));

drop policy if exists "subscriptions_write_admin" on public.subscriptions;
create policy "subscriptions_write_admin" on public.subscriptions
  for insert to authenticated
  with check (public.is_tenant_admin(tenant_id) or public.is_superadmin());

drop policy if exists "subscriptions_update_admin" on public.subscriptions;
create policy "subscriptions_update_admin" on public.subscriptions
  for update to authenticated
  using (public.is_tenant_admin(tenant_id) or public.is_superadmin())
  with check (public.is_tenant_admin(tenant_id) or public.is_superadmin());

-- ============ transactions ============
alter table public.transactions enable row level security;

drop policy if exists "transactions_select_tenant_member" on public.transactions;
create policy "transactions_select_tenant_member" on public.transactions
  for select to authenticated using (public.is_tenant_member(tenant_id));

-- INSERT/UPDATE hanya via service-role (webhook) — tidak beri policy client (fail-closed).

-- ============ plans / plan_prices (katalog publik; hanya superadmin mutasi) ============
alter table public.plans enable row level security;
drop policy if exists "plans_read_public" on public.plans;
create policy "plans_read_public" on public.plans
  for select to anon, authenticated using (true);
drop policy if exists "plans_write_superadmin" on public.plans;
create policy "plans_write_superadmin" on public.plans
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

alter table public.plan_prices enable row level security;
drop policy if exists "plan_prices_read_public" on public.plan_prices;
create policy "plan_prices_read_public" on public.plan_prices
  for select to anon, authenticated using (true);
drop policy if exists "plan_prices_write_superadmin" on public.plan_prices;
create policy "plan_prices_write_superadmin" on public.plan_prices
  for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

-- ============ api_keys ============
alter table tenant_shared.api_keys enable row level security;

drop policy if exists "api_keys_select_tenant_member" on tenant_shared.api_keys;
create policy "api_keys_select_tenant_member" on tenant_shared.api_keys
  for select to authenticated using (public.is_tenant_member(tenant_id));

drop policy if exists "api_keys_write_admin" on tenant_shared.api_keys;
create policy "api_keys_write_admin" on tenant_shared.api_keys
  for all to authenticated
  using (public.is_tenant_admin(tenant_id) or public.is_superadmin())
  with check (public.is_tenant_admin(tenant_id) or public.is_superadmin());

-- ============ profiles (UPDATE: hanya pemilik atau superadmin — kunci is_superadmin) ============
-- SELECT sudah di soft-delete.sql. Tambah UPDATE guard.
drop policy if exists "profiles_update_self_or_superadmin" on public.profiles;
create policy "profiles_update_self_or_superadmin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_superadmin())
  with check (id = auth.uid() or public.is_superadmin());
