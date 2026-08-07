// app/api/contact/route.ts
//
// Contact form (public, no auth required). Reusable untuk enterprise inquiry +
// general contact. Stores ke enterprise_inquiries (dgn subject) + kirim email superadmin.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { enterpriseInquiryRepository } from "@/supabase/repositories/enterprise-inquiries";
import { siteConfig } from "@/config/site";

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || ""
});

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!email || !message) {
      return NextResponse.json(
        { error: "Email dan pesan wajib diisi." },
        { status: 400 }
      );
    }

    // Simpan ke enterprise_inquiries (reusable utk contact umum + enterprise).
    const { error: insertErr } = await (
      await enterpriseInquiryRepository(supabaseAdmin)
    ).insert({
      name: name || null,
      email,
      subject: subject || null,
      message,
      plan_id: null,
      status: "new"
    });

    if (insertErr) throw insertErr;

    // Kirim email notifikasi ke superadmin (non-blocking).
    try {
      const senderEmail =
        process.env.MAILERSEND_SENDER_EMAIL || "noreply@example.com";
      const superadminEmail = process.env.SUPERADMIN_EMAIL || senderEmail;
      const emailParams = new EmailParams()
        .setFrom(new Sender(senderEmail, siteConfig.name))
        .setTo([new Recipient(superadminEmail, "Superadmin")])
        .setSubject(`[Contact] ${subject || "Pesan Baru"} — ${name || email}`)
        .setHtml(
          `<div style="font-family:sans-serif;padding:20px;">` +
            `<h3>Pesan Kontak Baru</h3>` +
            `<p><b>Nama:</b> ${name || "-"}</p>` +
            `<p><b>Email:</b> ${email}</p>` +
            `<p><b>Subjek:</b> ${subject || "-"}</p>` +
            `<p><b>Pesan:</b></p><p>${message}</p>` +
            `</div>`
        );
      await mailersend.email.send(emailParams);
    } catch (emailErr: any) {
      console.warn("[contact] Gagal kirim email:", emailErr?.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Contact API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
