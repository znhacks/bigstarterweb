// supabase/helper/coupon-redemptions.ts
//
// Helper pengambilan data tabel `coupon_redemptions` (schema public).
// Mencatat penggunaan coupon per user/tenant (metering pembatasan pemakaian).

import { getClient, type AnySupabaseClient } from "./client";
import { couponRedemptionRepository } from "@/supabase/repositories/coupon-redemptions";

/** Ambil seluruh redemption untuk sebuah coupon. */
export async function getCouponRedemptionsByCoupon(
  couponId: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await couponRedemptionRepository(supabase);
  return repo.query().select(select as "*").eq("coupon_id", couponId);
}

/** Hitung jumlah redemption sebuah coupon (pengecekan batas pemakaian). */
export async function countCouponRedemptionsByCoupon(
  couponId: string,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await couponRedemptionRepository(supabase);
  return repo
    .query()
    .select("*", { count: "exact", head: true })
    .eq("coupon_id", couponId);
}
