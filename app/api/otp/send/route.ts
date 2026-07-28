import { NextResponse } from "next/server";
import { issueOtp } from "@/lib/otp/service";
import { AUTH_FEATURES } from "@/config/auth";

export async function POST(req: Request) {
  if (!AUTH_FEATURES.enablePasswordlessOtp) {
    return NextResponse.json({ ok: false, error: "OTP dinonaktifkan." }, { status: 404 });
  }
  try {
    const { target, channel, purpose } = await req.json();
    if (!target || !channel || !purpose) {
      return NextResponse.json(
        { ok: false, error: "target, channel, purpose wajib diisi." },
        { status: 400 }
      );
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || null;
    const res = await issueOtp(target, channel, purpose, ip);
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  } catch (e: any) {
    console.error("OTP send error:", e);
    return NextResponse.json({ ok: false, error: "Internal error." }, { status: 500 });
  }
}
