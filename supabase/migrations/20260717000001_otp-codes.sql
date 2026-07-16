-- =====================================================================
-- OTP engine: tabel otp_codes.
-- Akses: SERVICE-ROLE ONLY (RLS enabled, no policies) — anon/authenticated
-- ditolak. API routes (/api/otp/send|verify) memakai supabaseAdmin.
-- Code disimpan sbg HASH (bukan plain) utk mitigasi DB leak.
-- =====================================================================

create table if not exists public.otp_codes (
  id uuid not null default gen_random_uuid() primary key,
  target text not null,                 -- email atau E.164 phone
  channel text not null,                -- email | wa | sms
  purpose text not null,                -- login | verify_email | verify_phone | custom
  code_hash text not null,              -- sha256(code + per-row salt)
  code_salt text not null,              -- salt acak per row
  attempts int not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  ip text null
);

create index if not exists idx_otp_target
  on public.otp_codes (target, channel, purpose, created_at desc);

-- RLS: aktif tanpa policy → hanya service role yg bisa akses.
alter table public.otp_codes enable row level security;
