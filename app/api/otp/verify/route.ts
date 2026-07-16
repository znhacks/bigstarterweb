import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp/service";
import { supabaseAdmin } from "@/lib/api/supabase-server";

export async function POST(req: Request) {
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

    // LOGIN via email: generate token_hash, JANGAN redirect ke action_link.
    // Client akan memanggil supabase.auth.verifyOtp({ token_hash, type: "magiclink" })
    // sendiri di sisi browser — tidak ada redirect, tidak ada hash fragment,
    // tidak butuh route /auth/callback sama sekali.
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

    // purpose lain (verify_email/phone/custom): cukup kembalikan valid=true; caller menandai kontak.
    return NextResponse.json({ ok: true, valid: true });
  } catch (e: any) {
    console.error("OTP verify error:", e);
    return NextResponse.json(
      { ok: false, valid: false, error: "Internal error." },
      { status: 500 }
    );
  }
}
