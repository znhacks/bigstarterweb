-- ============================================================================
-- API Keys table for the public API (Hono + oRPC + Supabase).
--
-- Run this once against your Supabase project (SQL Editor, or `supabase db push`):
--
--   psql "$DATABASE_URL" -f supabase/migrations/0001_create_api_keys.sql
--
-- Design notes:
--   * We never store the raw key. `key_hash` is the SHA-256 hex digest of the
--     full `sk_live_...` value; `key_prefix` is the visible label shown in the UI.
--   * `tenant_id` binds a key to a single organization, which is how the public
--     API enforces tenant scoping for external callers.
--   * `revoked_at` (nullable) soft-deletes a key; auth checks filter `IS NULL`.
--   * RLS is enabled. The service-role client (used by the API) bypasses RLS.
-- ============================================================================

create table if not exists public.api_keys (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  name         text        not null,
  key_prefix   text        not null,
  key_hash     text        not null unique,
  last_used_at timestamptz,
  last_used_ip inet,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz
);

create index if not exists api_keys_tenant_id_idx on public.api_keys(tenant_id);
create index if not exists api_keys_key_hash_idx   on public.api_keys(key_hash);
create index if not exists api_keys_active_lookup  on public.api_keys(key_hash) where revoked_at is null;

alter table public.api_keys enable row level security;

-- Optional: let the browser client (anon, authenticated) read/manage keys for
-- tenants they belong to. The API uses the service role and bypasses RLS, so this
-- policy only affects any direct client-side access. Safe to leave as-is.
drop policy if exists "api_keys managed by tenant members" on public.api_keys;
create policy "api_keys managed by tenant members"
  on public.api_keys
  for all
  using (
    exists (
      select 1
      from public.memberships m
      where m.tenant_id = api_keys.tenant_id
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.tenant_id = api_keys.tenant_id
    )
  );
