// supabase/helper/screenshot-logs.ts
//
// Helper pengambilan data tabel `screenshot_logs` (schema public).
// Tabel ini dipakai sebagai metering usage fitur per tenant.

import { getClient, type AnySupabaseClient } from "./client";
import { screenshotLogRepository } from "@/supabase/repositories/screenshot-logs";

/** Ambil daftar log pada sebuah tenant. */
export async function getScreenshotLogsByTenant(
  tenantId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await screenshotLogRepository(supabase);
  return repo.query().select(select as "*").eq("tenant_id", tenantId);
}

/**
 * Hitung pemakaian fitur sebuah tenant. `sinceISO` opsional untuk membatasi
 * pada rentang waktu (mis. awal bulan berjalan untuk metering bulanan).
 */
export async function countScreenshotLogsByTenant(
  tenantId: string,
  sinceISO?: string,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await screenshotLogRepository(supabase);
  let query = repo
    .query()
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (sinceISO) query = query.gte("created_at", sinceISO);
  return query;
}
