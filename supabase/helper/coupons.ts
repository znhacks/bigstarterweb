// supabase/helper/coupons.ts
//
// Helper pengambilan data tabel `coupons` (schema public).

import { getClient, type AnySupabaseClient } from "./client";
import { couponRepository } from "@/supabase/repositories/coupons";

/** Ambil satu coupon berdasarkan id. */
export async function getCoupon(
  id: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await couponRepository(supabase);
  return repo.query().select(select as "*").eq("id", id).single();
}

/** Ambil satu coupon berdasarkan kode (validasi saat checkout). */
export async function getCouponByCode(
  code: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await couponRepository(supabase);
  return repo.query().select(select as "*").eq("code", code).maybeSingle();
}

/** Ambil daftar seluruh coupon. */
export async function listCoupons(
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await couponRepository(supabase);
  return repo.query().select(select as "*");
}
