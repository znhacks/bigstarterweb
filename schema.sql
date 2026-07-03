-- Jalankan di SQL Editor Supabase untuk membuat fungsi pembuat skema otomatis
create or replace function create_new_tenant_schema(tenant_subdomain text)
returns void as $$
begin
  -- 1. Buat skema baru
  execute format('create schema %I', 'tenant_' || tenant_subdomain);

  -- 2. Salin tabel dari template ke skema baru (contoh tabel projects)
  execute format('create table %I.projects (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    created_at timestamp with time zone default now()
  )', 'tenant_' || tenant_subdomain);
  
  -- Tambahkan tabel-tabel operasional lainnya di sini...
end;
$$ language plpgsql security definer;