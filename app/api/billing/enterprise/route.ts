// app/api/billing/enterprise/route.ts
//
// User mengirim form "hubungi sales" untuk paket enterprise. Hanya mencatat
// inquiry ke tabel enterprise_inquiries — TIDAK ada charge/pembayaran.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isTenantMember } from "@/lib/billing/tenant-auth";
import { enterpriseInquiryRepository } from "@/supabase/repositories/enterprise-inquiries";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, planId, name, email, message } = body;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId wajib dikirimkan" }, { status: 400 });
    }

    // Cegah IDOR: pastikan user adalah anggota tenant yg dimanipulasi
    const isMember = await isTenantMember(supabaseAdmin, user.id, tenantId);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden: bukan anggota tenant" }, { status: 403 });
    }

    const { error } = await (await enterpriseInquiryRepository(supabaseAdmin)).insert({
      tenant_id: tenantId,
      user_id: user.id,
      plan_id: planId || null,
      name,
      email,
      message,
      status: "new"
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Enterprise Inquiry API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
