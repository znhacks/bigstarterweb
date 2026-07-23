// supabase/helper/subscriptions.ts
//
// Helper pengambilan data tabel `subscriptions` (schema public).
// Satu tenant umumnya punya satu subscription aktif (1:1 via tenant_id).

import { getClient, type AnySupabaseClient } from "./client";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";

/** Ambil satu subscription berdasarkan id. */
export async function getSubscription(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await subscriptionRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil subscription sebuah tenant (maybeSingle — bisa belum berlangganan). */
export async function getSubscriptionByTenant(
  tenantId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await subscriptionRepository(supabase);
  return repo
    .query()
    .select(select as "*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
}

/** Ambil daftar seluruh subscription. */
export async function listSubscriptions(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await subscriptionRepository(supabase);
  return repo.query().select(select as "*");
}
