import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp/service";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { AUTH_FEATURES } from "@/config/auth";

export async function POST(req: Request) {
  if (!AUTH_FEATURES.enablePasswordlessOtp) {
    return NextResponse.json(
      { ok: false, valid: false, error: "OTP dinonaktifkan." },
      { status: 404 }
    );
  }
  try {
    const { target, channel, purpose, code } = await req.json();
    if (!target || !channel || !purpose || !code) {
      return NextResponse.json(
        { ok: false, valid: false, error: "target, channel, purpose, code wajib diisi." },
        { status: 400 }
      );
    }

    const res = await verifyOtp(target, channel, purpose, code);
    if (!res.valid) {
      return NextResponse.json(res, { status: 400 });
    }

    if (purpose === "login" && channel === "email") {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: target
      });

      if (error || !data?.properties?.hashed_token) {
        console.error("generateLink failed:", error?.message);
        return NextResponse.json(
          { ok: false, valid: true, error: "Gagal membuat sesi login." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        valid: true,
        tokenHash: data.properties.hashed_token
      });
    }

    return NextResponse.json({ ok: true, valid: true });
  } catch (e: any) {
    console.error("OTP verify error:", e);
    return NextResponse.json(
      { ok: false, valid: false, error: "Internal error." },
      { status: 500 }
    );
  }
}
