// app/(auth)/(superadmin)/superadmin/coupons/actions.ts
"use server";

import { requireSuperadmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { couponRedemptionRepository } from "@/supabase/repositories/coupon-redemptions";

export async function getCouponRedemptions(couponId: string) {
  // Pastikan pengguna adalah superadmin sebelum mengeksekusi
  await requireSuperadmin();

  if (!couponId) {
    return { success: false, error: "ID kupon tidak valid." };
  }

  // Melakukan kueri menggunakan supabaseAdmin untuk bypass RLS
  const { data, error } = await (await couponRedemptionRepository(supabaseAdmin))
    .query()
    .select(
      `
      id,
      redeemed_at,
      tenants (
        name
      )
    `
    )
    .eq("coupon_id", couponId);

  if (error) {
    return { success: false, error: error.message };
  }

  const formatted = (data || []).map((row: any) => ({
    id: row.id,
    redeemed_at: row.redeemed_at,
    tenant_name: row.tenants?.name || "Unknown Tenant"
  }));

  return { success: true, redemptions: formatted };
}
