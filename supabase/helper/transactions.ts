// supabase/helper/transactions.ts
//
// Helper pengambilan data tabel `transactions` (schema public).

import { getClient, type AnySupabaseClient } from "./client";
import { transactionRepository } from "@/supabase/repositories/transactions";

/** Ambil satu transaction berdasarkan id. */
export async function getTransaction(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await transactionRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil semua transaksi pada sebuah tenant (riwayat billing). */
export async function getTransactionsByTenant(
  tenantId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await transactionRepository(supabase);
  return repo.query().select(select as "*").eq("tenant_id", tenantId);
}

/** Ambil daftar seluruh transaction. */
export async function listTransactions(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await transactionRepository(supabase);
  return repo.query().select(select as "*");
}
