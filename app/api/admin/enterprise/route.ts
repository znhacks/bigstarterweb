// app/api/admin/enterprise/route.ts
//
// Superadmin: menarik seluruh inquiry paket enterprise (inbox).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { profileRepository } from "@/supabase/repositories/profiles";
import { enterpriseInquiryRepository } from "@/supabase/repositories/enterprise-inquiries";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * FUNGSI PEMBANTU: Memvalidasi apakah pemanggil adalah Superadmin
 */
async function validateSuperadmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) throw new Error("Invalid token");

  // Membaca kolom is_superadmin langsung dari tabel profiles (System Role)
  const { data: profile, error: profileErr } = await (
    await profileRepository(supabaseAdmin)
  )
    .query()
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr || !profile || profile.is_superadmin !== true) {
    throw new Error("Forbidden: Hanya Superadmin yang diizinkan");
  }

  return user;
}

export async function GET(req: Request) {
  try {
    await validateSuperadmin(req);

    const { data: inquiries, error } = await (
      await enterpriseInquiryRepository(supabaseAdmin)
    )
      .query()
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, inquiries });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      {
        status:
          error.message === "Unauthorized"
            ? 401
            : error.message.includes("Hanya Superadmin")
              ? 403
              : 500
      }
    );
  }
}
