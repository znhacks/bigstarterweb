import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { profileRepository } from "@/supabase/repositories/profiles";
import { enterpriseInquiryRepository } from "@/supabase/repositories/enterprise-inquiries";
import { supabaseAdmin } from "@/lib/api/supabase-server";

async function validateSuperadmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) throw new Error("Invalid token");

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

const VALID_STATUSES = ["new", "contacted", "closed"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateSuperadmin(req);

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const { error } = await (
      await enterpriseInquiryRepository(supabaseAdmin)
    ).markStatus(id, status);

    if (error) throw error;

    return NextResponse.json({ success: true });
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
