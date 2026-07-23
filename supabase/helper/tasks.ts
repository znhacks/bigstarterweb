// supabase/helper/tasks.ts
//
// Helper pengambilan data tabel `tasks`.
//
// PENTING — tabel `tasks` berada di schema DATA TENANT (tenant_shared /
// tenant_<subdomain>), BUKAN public. Akibatnya default client (schema public)
// TIDAK dapat melihat tabel ini. Karena itu WAJIB meneruskan tenant-scoped
// client dari `createTenantServerClient()` pada argumen `client`:
//
//   const { client } = await createTenantServerClient(tenantId);
//   const { data } = await getTasksByTenant(tenantId, "*", client);
//
// RLS berlaku pada client tersebut (auth.uid() ter-resolve).
// Catatan: query builder `taskRepository` hanya membungkus nama tabel;
// resolusi schema tetap bergantung pada client yang diteruskan ke helper.

import { getClient, type AnySupabaseClient } from "./client";
import { taskRepository } from "@/supabase/repositories/tasks";

/** Ambil satu task berdasarkan id dalam lingkup tenant. */
export async function getTask(
  id: string,
  tenantId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await taskRepository(supabase);
  return repo
    .query()
    .select(select as "*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
}

/** Ambil semua task pada sebuah tenant. */
export async function getTasksByTenant(
  tenantId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await taskRepository(supabase);
  return repo.query().select(select as "*").eq("tenant_id", tenantId);
}

/** Hitung jumlah task pada sebuah tenant (metering usage). */
export async function countTasksByTenant(
  tenantId: string,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await taskRepository(supabase);
  return repo
    .query()
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
}
