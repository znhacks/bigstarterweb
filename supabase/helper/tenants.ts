// supabase/helper/tenants.ts
//
// Helper pengambilan data tabel `tenants` (schema public).
// Tenant di-resolve by id (UTAMA), slug (URL), atau subdomain (manager/DB model).

import { getClient, type AnySupabaseClient } from "./client";
import { tenantRepository } from "@/supabase/repositories/tenants";

/** Ambil satu tenant berdasarkan id. */
export async function getTenant(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await tenantRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil satu tenant berdasarkan id, mengembalikan null bila tidak ada. */
export async function getTenantMaybe(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await tenantRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).maybeSingle();
}

/** Ambil satu tenant berdasarkan slug (dipakai di rute dinamis URL). */
export async function getTenantBySlug(
  slug: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await tenantRepository(supabase);
  return repo.query().select(select as "*").eq("slug", slug).single();
}

/** Ambil satu tenant berdasarkan subdomain (dipakai untuk resolve schema DB). */
export async function getTenantBySubdomain(
  subdomain: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await tenantRepository(supabase);
  return repo
    .query()
    .select(select as "*")
    .eq("subdomain", subdomain)
    .single();
}

/** Ambil daftar seluruh tenant. */
export async function listTenants(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await tenantRepository(supabase);
  return repo.query().select(select as "*");
}
