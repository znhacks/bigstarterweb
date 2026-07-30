// supabase/helper/index.ts
//
// Barrel untuk semua helper pengambilan data Supabase.
//
// Tiap helper menerima `select` (default "*") supaya fleksibel — Anda bebas
// memodifikasi kolom/relasi yang diambil. Argumen `client` opsional untuk
// mengganti client default (SSR server client, schema public):
//   - service-role  : supabaseAdmin / systemClient
//   - tenant-scoped : client dari createTenantServerClient()  ← WAJIB untuk `tasks`
//   - browser       : supabase (@/lib/supabase) — di Client Component
//
// Catatan: helper bersifat server-by-default (createClient memakai next/headers).
// Lihat ./client.ts untuk detail.

export * from "./client";
export * from "./profiles";
export * from "./tenants";
export * from "./memberships";
export * from "./roles";
export * from "./permissions";
export * from "./role-permissions";
export * from "./invitations";
export * from "./plans";
export * from "./plan-prices";
export * from "./subscriptions";
export * from "./transactions";
export * from "./coupons";
export * from "./coupon-redemptions";
export * from "./tasks";
export * from "./notifications";
export * from "./api-keys";
export * from "./otp-codes";
export * from "./screenshot-logs";
export * from "./countries";
export * from "./states";
export * from "./cities";
export * from "./kecamatan";
export * from "./desa";
