create or replace function public.create_new_tenant_schema(tenant_subdomain text)
returns void as $$
begin
  -- 1. Buat skema baru untuk tenant (misal: tenant_client_a)
  execute format('create schema if not exists %I', 'tenant_' || tenant_subdomain);

  -- 2. Buat tabel 'tasks' di dalam skema baru (Tanpa kolom tenant_id)
  execute format('
    create table if not exists %I.tasks (
      id uuid not null default gen_random_uuid (),
      title character varying(255) null,
      created_at timestamp without time zone null default now(),
      constraint tasks_pkey primary key (id)
    )
  ', 'tenant_' || tenant_subdomain);

  -- 3. Buat tabel 'api_keys' di dalam skema baru (Tanpa kolom tenant_id)
  execute format('
    create table if not exists %I.api_keys (
      id uuid not null default gen_random_uuid (),
      name text not null,
      key_prefix text not null,
      key_hash text not null,
      last_used_at timestamp with time zone null,
      last_used_ip inet null,
      created_at timestamp with time zone not null default now(),
      revoked_at timestamp with time zone null,
      constraint api_keys_pkey primary key (id),
      constraint api_keys_key_hash_key unique (key_hash)
    )
  ', 'tenant_' || tenant_subdomain);

  -- 4. Buat indeks untuk api_keys di skema baru
  execute format('create index if not exists api_keys_key_hash_idx on %I.api_keys (key_hash)', 'tenant_' || tenant_subdomain);

end;
$$ language plpgsql security definer;