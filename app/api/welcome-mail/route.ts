// app/api/webhooks/welcome-email/route.ts
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail/dispatcher";

function extractWelcomePayload(payload: any) {
  if (payload?.record?.email) {
    const record = payload.record;
    const metadata = record.raw_user_meta_data || {};
    return {
      email: record.email,
      fullName: metadata.full_name || record.full_name || "Pengguna"
    };
  }

  if (typeof payload?.email === "string") {
    return {
      email: payload.email,
      fullName: payload.fullName || payload.full_name || "Pengguna"
    };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("x-webhook-secret");
    if (authHeader && process.env.WEBHOOK_SECRET && authHeader !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const welcomePayload = extractWelcomePayload(payload);

    if (!welcomePayload?.email) {
      return NextResponse.json({ error: "No email provided" }, { status: 400 });
    }

    const { email, fullName } = welcomePayload;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 8px;">
        <h2 style="color: #111;">Halo, ${fullName}!</h2>
        <p>Terima kasih telah mendaftar di platform kami. Akun Anda berhasil dibuat.</p>
        <p>Kami senang Anda bergabung. Jika ada pertanyaan, jangan ragu untuk menghubungi tim dukungan kami.</p>
        <br />
        <p>Salam hangat,</p>
        <p><strong>Tim Kami</strong></p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: "Selamat Datang!",
      html: htmlContent
    });

    return NextResponse.json({ success: true, message: "Welcome email sent" });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
