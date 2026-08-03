-- =========================================================================
-- SYSTEM EXTENSIONS (Letakkan di bagian paling atas file migrasi)
-- =========================================================================

-- Mengaktifkan ekstensi UUID generator
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Mengaktifkan ekstensi kriptografi (dibutuhkan untuk fungsi gen_random_uuid dan enkripsi)
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Mengaktifkan Supabase Vault (untuk penyimpanan kredensial rahasia)
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA extensions;

-- Mengaktifkan pg_net (untuk melakukan HTTP request langsung dari database)
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;

-- Mengaktifkan statistik performa kueri
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;

-- Migration file: Create complete database schema (public & tenant_shared schemas)

-- =========================================================================
-- INITIALIZATION: CREATE ADDITIONAL SCHEMAS & EXTENSIONS
-- =========================================================================

CREATE SCHEMA IF NOT EXISTS tenant_shared;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- PUBLIC SCHEMA - TIER 1: TABLES WITH NO DEPENDENCIES
-- =========================================================================

-- Table: public.countries
CREATE TABLE IF NOT EXISTS public.countries (
    id INTEGER PRIMARY KEY,
    name CHARACTER VARYING(100) NOT NULL,
    iso3 CHARACTER(3) NULL,
    numeric_code CHARACTER(3) NULL,
    iso2 CHARACTER(2) NULL,
    phone_code CHARACTER VARYING(20) NULL,
    capital CHARACTER VARYING(100) NULL,
    currency CHARACTER VARYING(3) NULL,
    currency_symbol CHARACTER VARYING(6) NULL,
    tld CHARACTER VARYING(4) NULL,
    native CHARACTER VARYING(100) NULL,
    region CHARACTER VARYING(30) NULL,
    sub_region CHARACTER VARYING(50) NULL,
    timezones TEXT NULL,
    translations TEXT NULL,
    default_format TEXT NULL,
    latitude NUMERIC(10,8) NULL,
    longitude NUMERIC(11,8) NULL,
    emoji CHARACTER VARYING(30) NULL,
    emoji_u CHARACTER VARYING(30) NULL,
    wiki_data_id CHARACTER VARYING(10) NULL,
    notes CHARACTER VARYING(255) NULL,
    inserted_at TIMESTAMPTZ NULL DEFAULT now(),
    inserted_by CHARACTER VARYING(100) NULL DEFAULT 'System'::character varying,
    updated_at TIMESTAMPTZ NULL DEFAULT now(),
    updated_by CHARACTER VARYING(100) NULL DEFAULT 'System'::character varying
);

-- Table: public.kecamatan
CREATE TABLE IF NOT EXISTS public.kecamatan (
    id INTEGER PRIMARY KEY,
    nama_kecamatan CHARACTER VARYING(100) NULL,
    nama_alt CHARACTER VARYING(100) NULL,
    id_kab_kota INTEGER NULL,
    id_provinsi INTEGER NULL,
    id_negara INTEGER NULL,
    inserted_at TIMESTAMPTZ NULL DEFAULT now(),
    inserted_by CHARACTER VARYING(100) NULL DEFAULT 'System'::character varying,
    updated_at TIMESTAMPTZ NULL DEFAULT now(),
    updated_by CHARACTER VARYING(100) NULL DEFAULT 'System'::character varying
);

-- Table: public.plans
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    name JSONB NOT NULL DEFAULT '{"en": ""}'::jsonb,
    description JSONB NOT NULL DEFAULT '{"en": ""}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_features JSONB NOT NULL DEFAULT '{"en": []}'::jsonb,
    features JSONB NOT NULL DEFAULT '{"en": []}'::jsonb,
    is_enterprise BOOLEAN NOT NULL DEFAULT false,
    is_recommended BOOLEAN NOT NULL DEFAULT false,
    trial_days INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NULL DEFAULT 0,
    weight INTEGER NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.roles
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    hierarchy_level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NULL DEFAULT now()
);

-- Table: public.permissions
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMPTZ NULL DEFAULT now()
);

-- Table: public.profiles (Depends on auth.users in Supabase context)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name CHARACTER VARYING(255) NULL,
    avatar CHARACTER VARYING NULL,
    preferred_language TEXT NULL DEFAULT 'en'::text,
    timezone TEXT NULL DEFAULT 'UTC'::text,
    is_superadmin BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'active'::text,
    banned_until TIMESTAMPTZ NULL,
    banned_reason TEXT NULL,
    address_line1 TEXT NULL,
    address_line2 TEXT NULL,
    address_city TEXT NULL,
    address_region TEXT NULL,
    address_postal_code TEXT NULL,
    address_country TEXT NULL,
    address_kecamatan TEXT NULL,
    address_desa TEXT NULL,
    description TEXT NULL,
    phone TEXT NULL,
    currency TEXT NULL,
    theme JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

-- Table: public.tenants
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name CHARACTER VARYING(255) NOT NULL,
    logo CHARACTER VARYING NULL,
    slug CHARACTER VARYING(255) NULL,
    db_model TEXT NOT NULL DEFAULT 'SHARED'::text,
    status TEXT NOT NULL DEFAULT 'active'::text,
    address_line1 CHARACTER VARYING(255) NULL,
    address_line2 CHARACTER VARYING(255) NULL,
    city CHARACTER VARYING(100) NULL,
    state_province CHARACTER VARYING(100) NULL,
    postal_code CHARACTER VARYING(20) NULL,
    country_code CHARACTER VARYING(2) NULL,
    business_email CHARACTER VARYING(255) NULL,
    phone_number CHARACTER VARYING(50) NULL,
    tax_id CHARACTER VARYING(100) NULL,
    default_locale CHARACTER VARYING(10) NOT NULL DEFAULT 'en'::character varying,
    timezone CHARACTER VARYING(100) NOT NULL DEFAULT 'UTC'::character varying,
    currency CHARACTER VARYING(3) NOT NULL DEFAULT 'USD'::character varying,
    description TEXT NULL,
    website TEXT NULL,
    kecamatan TEXT NULL,
    desa TEXT NULL,
    theme JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

-- Table: public.coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    discount_type TEXT NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    valid_until TIMESTAMPTZ NULL,
    max_redemptions INTEGER NULL,
    redeemed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.enterprise_inquiries
CREATE TABLE IF NOT EXISTS public.enterprise_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NULL,
    user_id UUID NULL,
    plan_id TEXT NOT NULL,
    name TEXT NULL,
    email TEXT NULL,
    subject TEXT NULL,
    message TEXT NULL,
    status TEXT NOT NULL DEFAULT 'new'::text,
    created_at TIMESTAMPTZ NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NULL
);

-- Table: public.otp_codes
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target TEXT NOT NULL,
    channel TEXT NOT NULL,
    purpose TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    code_salt TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip TEXT NULL
);

-- Table: public.notification_categories
CREATE TABLE IF NOT EXISTS public.notification_categories (
    id TEXT PRIMARY KEY,
    label_key TEXT NOT NULL,
    description TEXT NULL,
    default_channels JSONB NOT NULL DEFAULT '{"push": false, "email": true, "in_app": true}'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_system BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);


-- =========================================================================
-- PUBLIC SCHEMA - TIER 2: TABLES WITH DIRECT DEPENDENCIES ON TIER 1
-- =========================================================================

-- Table: public.states
CREATE TABLE IF NOT EXISTS public.states (
    id INTEGER PRIMARY KEY,
    name CHARACTER VARYING(100) NOT NULL,
    country_id INTEGER NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
    country_code CHARACTER(2) NOT NULL,
    fips_code CHARACTER VARYING(8) NULL,
    iso2 CHARACTER VARYING(6) NULL,
    latitude NUMERIC(10,8) NULL,
    longitude NUMERIC(11,8) NULL,
    wiki_data_id CHARACTER VARYING(10) NULL,
    notes CHARACTER VARYING(255) NULL,
    inserted_at TIMESTAMPTZ NULL DEFAULT now(),
    inserted_by CHARACTER VARYING(100) NULL DEFAULT 'System'::character varying,
    updated_at TIMESTAMPTZ NULL DEFAULT now(),
    updated_by CHARACTER VARYING(100) NULL DEFAULT 'System'::character varying
);

-- Table: public.plan_prices
CREATE TABLE IF NOT EXISTS public.plan_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id TEXT NOT NULL UNIQUE REFERENCES public.plans(id) ON DELETE CASCADE,
    interval TEXT NOT NULL UNIQUE,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR'::text,
    product_id TEXT NULL,
    provider_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.role_permissions (Junction Table with Composite Key)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Table: public.memberships
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    role_id UUID NULL REFERENCES public.roles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NULL DEFAULT now()
);

-- Table: public.invitations
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    email CHARACTER VARYING(255) NOT NULL UNIQUE,
    invited_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    role_id UUID NULL REFERENCES public.roles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NULL DEFAULT (now() + '7 days'::interval)
);

-- Table: public.coupon_redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL UNIQUE REFERENCES public.coupons(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.payment_orders
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    interval TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_order_id TEXT NULL,
    amount NUMERIC NOT NULL,
    charge_currency TEXT NOT NULL DEFAULT 'IDR'::text,
    plan_amount NUMERIC NULL,
    plan_currency TEXT NULL,
    amount_in_idr NUMERIC NULL,
    coupon_code TEXT NULL,
    status TEXT NOT NULL DEFAULT 'pending'::text,
    created_at TIMESTAMPTZ NULL DEFAULT now(),
    paid_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ NULL
);

-- Table: public.subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    plan_id TEXT NULL REFERENCES public.plans(id) ON DELETE SET NULL,
    pending_plan_id TEXT NULL,
    status TEXT NOT NULL,
    cancel_at_period_end BOOLEAN NULL DEFAULT false,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ends_at TIMESTAMPTZ NULL,
    provider TEXT NULL,
    provider_subscription_id TEXT NULL,
    provider_customer_id TEXT NULL,
    interval TEXT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NULL DEFAULT 'USD'::text,
    plan_id TEXT NULL REFERENCES public.plans(id) ON DELETE SET NULL,
    plan_name TEXT NULL,
    order_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    provider TEXT NULL,
    amount_in_idr NUMERIC(10,2) NULL,
    exchange_rate NUMERIC(10,4) NULL,
    exchange_api_used TEXT NULL,
    tax_amount NUMERIC(10,2) NULL DEFAULT 0,
    net_amount NUMERIC(10,2) NULL DEFAULT 0,
    fee_amount NUMERIC(10,2) NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title JSONB NOT NULL DEFAULT '{}'::jsonb,
    body JSONB NOT NULL DEFAULT '{}'::jsonb,
    audience TEXT NOT NULL DEFAULT 'all_users'::text,
    channels TEXT[] NOT NULL DEFAULT '{in_app,email}'::text[],
    status TEXT NOT NULL DEFAULT 'draft'::text,
    scheduled_for TIMESTAMPTZ NULL,
    sent_at TIMESTAMPTZ NULL,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.notification_templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL REFERENCES public.notification_categories(id) ON DELETE CASCADE,
    title JSONB NOT NULL DEFAULT '{}'::jsonb,
    body JSONB NOT NULL DEFAULT '{}'::jsonb,
    channels TEXT[] NOT NULL DEFAULT '{in_app,email}'::text[],
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    link TEXT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_system BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT ''::text,
    data JSONB NULL DEFAULT '{}'::jsonb,
    link TEXT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ NULL,
    source TEXT NOT NULL DEFAULT 'system'::text,
    source_ref TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);


-- =========================================================================
-- PUBLIC SCHEMA - TIER 3: TABLES DEPENDENT ON TIER 2
-- =========================================================================

-- Table: public.cities
CREATE TABLE IF NOT EXISTS public.cities (
    id INTEGER PRIMARY KEY,
    name CHARACTER VARYING(100) NOT NULL,
    state_id INTEGER NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
    state_code CHARACTER VARYING(10) NOT NULL,
    country_id INTEGER NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
    country_code CHARACTER(2) NOT NULL,
    latitude NUMERIC(10,8) NOT NULL,
    longitude NUMERIC(11,8) NOT NULL,
    wiki_data_id CHARACTER VARYING(10) NULL,
    notes CHARACTER VARYING(255) NULL,
    inserted_at TIMESTAMPTZ NULL DEFAULT now(),
    inserted_by CHARACTER VARYING(100) NULL DEFAULT 'System'::character varying,
    updated_at TIMESTAMPTZ NULL DEFAULT now(),
    updated_by CHARACTER VARYING(100) NULL DEFAULT 'System'::character varying
);

-- Table: public.desa
CREATE TABLE IF NOT EXISTS public.desa (
    id BIGINT PRIMARY KEY,
    nama_desa_kelurahan CHARACTER VARYING(100) NULL,
    nama_alt CHARACTER VARYING(100) NULL,
    desa_kelurahan CHARACTER VARYING(100) NULL,
    id_kecamatan INTEGER NULL REFERENCES public.kecamatan(id) ON DELETE CASCADE,
    id_kab_kota INTEGER NULL,
    id_provinsi INTEGER NULL DEFAULT 102,
    id_negara INTEGER NULL DEFAULT 102,
    kode_pos CHARACTER VARYING(100) NULL,
    inserted_at TIMESTAMPTZ NULL DEFAULT now(),
    inserted_by CHARACTER VARYING(100) NULL DEFAULT 'System'::character varying,
    updated_at TIMESTAMPTZ NULL DEFAULT now(),
    updated_by CHARACTER VARYING(100) NULL DEFAULT 'System'::character varying
);

-- Table: public.announcement_targets
CREATE TABLE IF NOT EXISTS public.announcement_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    tenant_id UUID NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: public.notification_delivery_logs
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NULL REFERENCES public.notifications(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    category TEXT NULL,
    title TEXT NULL,
    status TEXT NOT NULL,
    error TEXT NULL,
    provider TEXT NULL,
    source TEXT NOT NULL DEFAULT 'system'::text,
    source_ref TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);


-- =========================================================================
-- TENANT_SHARED SCHEMA: TABLES WITH REFERENCE TO PUBLIC SCHEMA
-- =========================================================================

-- Table: tenant_shared.api_keys
CREATE TABLE IF NOT EXISTS tenant_shared.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    last_used_at TIMESTAMPTZ NULL,
    last_used_ip INET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ NULL
);

-- Table: tenant_shared.tasks
CREATE TABLE IF NOT EXISTS tenant_shared.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title CHARACTER VARYING(255) NULL,
    description TEXT NULL,
    status TEXT NOT NULL DEFAULT 'todo'::text,
    priority TEXT NOT NULL DEFAULT 'medium'::text,
    due_date TIMESTAMPTZ NULL,
    assignee_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Migration file: Create Functions, Triggers, Storage Buckets, and Realtime Publications

-- =========================================================================
-- 1. USER-DEFINED FUNCTIONS
-- =========================================================================

-- Function: create_new_tenant_schema
CREATE OR REPLACE FUNCTION public.create_new_tenant_schema(tenant_subdomain text)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;


-- Function: has_higher_hierarchy
CREATE OR REPLACE FUNCTION public.has_higher_hierarchy(_tenant_id uuid, _target_user_id uuid)
RETURNS boolean AS $$
  select (
    -- Ambil hierarchy level pengguna aktif (yang sedang melakukan request)
    (select r.hierarchy_level 
     from public.memberships m
     join public.roles r on m.role_id = r.id
     where m.user_id = auth.uid() and m.tenant_id = _tenant_id)
    > 
    -- Bandingkan dengan hierarchy level pengguna target
    (select r.hierarchy_level 
     from public.memberships m
     join public.roles r on m.role_id = r.id
     where m.user_id = _target_user_id and m.tenant_id = _tenant_id)
  );
$$ LANGUAGE sql STABLE;


-- Function: has_permission
CREATE OR REPLACE FUNCTION public.has_permission(_tenant_id uuid, _permission_name text)
RETURNS boolean AS $$
  select exists (
    select 1 
    from public.memberships m
    join public.role_permissions rp on m.role_id = rp.role_id
    join public.permissions p on rp.permission_id = p.id
    where m.user_id = auth.uid() 
      and m.tenant_id = _tenant_id
      and p.name = _permission_name
  );
$$ LANGUAGE sql STABLE;


-- Function: is_superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_superadmin = true
);
$$ LANGUAGE sql STABLE;


-- Function: is_tenant_admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id uuid)
RETURNS boolean AS $$
  select exists (
    select 1
    from public.memberships m
    join public.roles r on r.id = m.role_id
    where m.user_id = auth.uid()
      and m.tenant_id = _tenant_id
      and lower(r.name) in ('admin', 'owner')
  );
$$ LANGUAGE sql STABLE;


-- Function: is_tenant_admin_only
CREATE OR REPLACE FUNCTION public.is_tenant_admin_only(_tenant_id uuid)
RETURNS boolean AS $$
  select exists (
    select 1
    from public.memberships m
    join public.roles r on r.id = m.role_id
    where m.user_id = auth.uid()
      and m.tenant_id = _tenant_id
      and lower(r.name) = 'admin'
  );
$$ LANGUAGE sql STABLE;


-- Function: is_tenant_member
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid)
RETURNS boolean AS $$
  select exists (
    select 1
    from public.memberships
    where user_id = auth.uid()
      and tenant_id = _tenant_id
  );
$$ LANGUAGE sql STABLE;


-- Function: is_tenant_owner
CREATE OR REPLACE FUNCTION public.is_tenant_owner(_tenant_id uuid)
RETURNS boolean AS $$
  select exists (
    select 1
    from public.memberships m
    join public.roles r on r.id = m.role_id
    where m.user_id = auth.uid()
      and m.tenant_id = _tenant_id
      and lower(r.name) = 'owner'
  );
$$ LANGUAGE sql STABLE;


-- Function: redeem_coupon
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code text, p_tenant uuid)
RETURNS text AS $$
DECLARE
  v_coupon RECORD;
  v_existing uuid;
BEGIN
  IF p_code IS NULL OR p_tenant IS NULL THEN
    RETURN 'invalid';
  END IF;

  -- Kunci baris kupon untuk mencegah race condition antar webhook
  SELECT id, valid_until, max_redemptions, redeemed_count
    INTO v_coupon
  FROM public.coupons
  WHERE lower(code) = lower(p_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;

  -- Validasi kedaluwarsa
  IF v_coupon.valid_until IS NOT NULL AND now() > v_coupon.valid_until THEN
    RETURN 'expired';
  END IF;

  -- Validasi kuota
  IF v_coupon.max_redemptions IS NOT NULL
     AND v_coupon.redeemed_count >= v_coupon.max_redemptions THEN
    RETURN 'quota_full';
  END IF;

  -- Cek apakah tenant sudah pernah menukar (idempotent terhadap replay webhook)
  SELECT id INTO v_existing
  FROM public.coupon_redemptions
  WHERE coupon_id = v_coupon.id AND tenant_id = p_tenant
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN 'already_redeemed';
  END IF;

  -- Catat penebusan; constraint UNIQUE(coupon_id, tenant_id) menjadi pengaman akhir
  BEGIN
    INSERT INTO public.coupon_redemptions (coupon_id, tenant_id)
    VALUES (v_coupon.id, p_tenant);
  EXCEPTION WHEN unique_violation THEN
    RETURN 'already_redeemed';
  END;

  -- Increment penghitung
  UPDATE public.coupons
  SET redeemed_count = redeemed_count + 1
  WHERE id = v_coupon.id;

  RETURN 'redeemed';
END;
$$ LANGUAGE plpgsql;


-- Function: set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
begin
  new.updated_at = now();
  return new;
end;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- 2. DATABASE TRIGGERS
-- =========================================================================

-- Trigger on tenant_shared.tasks
DROP TRIGGER IF EXISTS trg_tasks_set_updated_at ON tenant_shared.tasks;
CREATE TRIGGER trg_tasks_set_updated_at
    BEFORE UPDATE ON tenant_shared.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();


-- =========================================================================
-- 3. SUPABASE STORAGE BUCKETS
-- =========================================================================

-- Mendaftarkan bucket 'avatars' ke skema internal storage Supabase
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, null, null)
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- 4. REALTIME PUBLICATIONS
-- =========================================================================

-- Menambahkan tabel ke publikasi 'supabase_realtime' secara aman jika belum terdaftar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'announcements'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;