// app/api/billing/validate-coupon/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, tenantId } = body;

    if (!code || !tenantId) {
      return NextResponse.json({ error: "Kode kupon dan Tenant ID wajib diisi" }, { status: 400 });
    }

    const formattedCode = code.trim(); // mixed-case/Unicode — lookup .ilike (case-insensitive)

    // 1. Ambil data kupon dari database
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .ilike("code", formattedCode)
      .maybeSingle();

    if (couponError || !coupon) {
      return NextResponse.json({ error: "Kode kupon tidak valid" }, { status: 404 });
    }

    // 2. Periksa batas tanggal kedaluwarsa
    if (coupon.valid_until && new Date() > new Date(coupon.valid_until)) {
      return NextResponse.json({ error: "Masa berlaku kupon sudah habis" }, { status: 400 });
    }

    // 3. Periksa kuota maksimal penebusan kupon
    if (coupon.max_redemptions !== null && coupon.redeemed_count >= coupon.max_redemptions) {
      return NextResponse.json({ error: "Kuota penukaran kupon sudah habis" }, { status: 400 });
    }

    // 4. Periksa apakah tenant ini sudah pernah menggunakan kupon ini sebelumnya
    const { data: redemption, error: redemptionError } = await supabaseAdmin
      .from("coupon_redemptions")
      .select("id")
      .eq("coupon_id", coupon.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (redemption) {
      return NextResponse.json(
        { error: "Organisasi Anda sudah pernah menggunakan kupon ini" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: parseFloat(coupon.discount_value)
    });
  } catch (error: any) {
    console.error("Validate Coupon Error:", error);
    return NextResponse.json({ error: "Gagal memproses validasi kupon" }, { status: 500 });
  }
}
