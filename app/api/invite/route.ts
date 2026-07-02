import { NextResponse } from "next/server";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { createClient } from "@supabase/supabase-js";
import { checkSeatLimit } from "@/lib/billing/enforcer"; // Import Seat-Based Enforcer
import { getUser } from "@/lib/auth";

// Inisialisasi klien Supabase admin/server untuk mencatat undangan
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || ""
});

export async function POST(req: Request) {
  const user = await getUser();

  try {
    const { email, role, orgName } = await BalancedBody(req);

    async function BalancedBody(request: Request) {
      return await request.json();
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!email || !role) {
      return NextResponse.json({ error: "Missing email or role" }, { status: 400 });
    }

    // 1. Dapatkan ID organisasi (tenant_id) berdasarkan nama organisasi
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("name", orgName)
      .single();

    if (tenantError || !tenantData) {
      return NextResponse.json(
        { error: `Organisasi '${orgName}' tidak ditemukan di database.` },
        { status: 404 }
      );
    }

    // --- INTEGRASI SEAT-BASED LIMIT CHECK (TAHAP 7) ---
    // Sebelum mencatat undangan baru dan mengirimkan email, kita periksa kuota anggota organisasi saat ini.
    const seatCheck = await checkSeatLimit(tenantData.id);

    if (!seatCheck.allowed) {
      return NextResponse.json(
        {
          error: "Limit Terlampaui",
          message: `Paket ${seatCheck.planName} Anda hanya mengizinkan maksimal ${seatCheck.max} anggota. Saat ini organisasi Anda sudah memiliki ${seatCheck.current} anggota. Silakan lakukan upgrade paket di halaman penagihan untuk mengundang lebih banyak anggota.`
        },
        { status: 403 }
      );
    }

    // 2. Kelola penyimpanan data undangan ke tabel 'invitations' secara manual
    const { data: existingInvite } = await supabase
      .from("invitations")
      .select("id")
      .eq("tenant_id", tenantData.id)
      .eq("email", email)
      .maybeSingle();

    if (existingInvite) {
      const { error: updateError } = await supabase
        .from("invitations")
        .update({ role })
        .eq("id", existingInvite.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("invitations").insert({
        tenant_id: tenantData.id,
        email,
        role
      });

      if (insertError) throw insertError;
    }

    // 3. Meng-encode data parameter ke Base64 untuk URL Join
    const tokenData = JSON.stringify({ email, role, orgName });
    const token = Buffer.from(tokenData).toString("base64");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const joinLink = `${appUrl}/join?token=${token}`;

    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 500px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2>Undangan Masuk Organisasi</h2>
        <p>Halo,</p>
        <p>Anda telah diundang untuk bergabung dengan organisasi <strong>${orgName}</strong> sebagai <strong>${role}</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${joinLink}" style="background-color: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
            Terima Undangan & Gabung
          </a>
        </p>
        <p style="color: #666; font-size: 12px;">Jika Anda merasa tidak melakukan pendaftaran ini, abaikan email ini.</p>
      </div>
    `;

    // 4. Konfigurasi Pengirim dengan fallback
    const senderEmail = process.env.MAILERSEND_SENDER_EMAIL || "MS_test@trial-xxxxx.mlsender.net";
    const sentFrom = new Sender(senderEmail, "Acme Support");

    // Konfigurasi Penerima
    const recipients = [new Recipient(email, "Invitee User")];

    // Buat parameter pengiriman email MailerSend
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(`Undangan bergabung ke ${orgName}`)
      .setHtml(htmlContent);

    // Proses pengiriman email
    const data = await mailersend.email.send(emailParams);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    // MENAMPILKAN ERROR ASLI DI TERMINAL VS CODE ANDA
    console.error("CRITICAL_INVITE_API_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
