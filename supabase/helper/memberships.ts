// supabase/helper/memberships.ts
//
// Helper pengambilan data tabel `memberships` (schema public).
// Menghubungkan user ↔ tenant ↔ role. Sering di-join ke tenants/roles/profiles
// lewat `select` (silakan modifikasi string select sesuai kebutuhan).

import { getClient, type AnySupabaseClient } from "./client";
import { membershipRepository } from "@/supabase/repositories/memberships";

/** Ambil satu membership berdasarkan id. */
export async function getMembership(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await membershipRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil semua membership milik seorang user (daftar org/tenant pengguna). */
export async function getMembershipsByUser(
  userId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await membershipRepository(supabase);
  return repo.query().select(select as "*").eq("user_id", userId);
}

/** Ambil semua membership di sebuah tenant (daftar anggota org). */
export async function getMembershipsByTenant(
  tenantId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await membershipRepository(supabase);
  return repo.query().select(select as "*").eq("tenant_id", tenantId);
}

/** Ambil membership spesifik (user, tenant). Bisa null bila user bukan anggota. */
export async function getMembershipByUserAndTenant(
  userId: string,
  tenantId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await membershipRepository(supabase);
  return repo
    .query()
    .select(select as "*")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
}

/** Hitung jumlah anggota (seat) pada sebuah tenant. */
export async function countMembershipsByTenant(
  tenantId: string,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await membershipRepository(supabase);
  return repo
    .query()
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
}
