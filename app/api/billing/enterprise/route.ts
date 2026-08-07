import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { isTenantMember } from "@/lib/billing/tenant-auth";
import { enterpriseInquiryRepository } from "@/supabase/repositories/enterprise-inquiries";
import { siteConfig } from "@/config/site";

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || ""
});

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

    const isMember = await isTenantMember(supabaseAdmin, user.id, tenantId);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden: bukan anggota tenant" }, { status: 403 });
    }

    const { error } = await (
      await enterpriseInquiryRepository(supabaseAdmin)
    ).insert({
      tenant_id: tenantId,
      user_id: user.id,
      plan_id: planId || null,
      name,
      email,
      message,
      status: "new"
    });

    if (error) throw error;

    try {
      const senderEmail = process.env.MAILERSEND_SENDER_EMAIL || "noreply@example.com";
      const superadminEmail = process.env.SUPERADMIN_EMAIL || senderEmail;
      const emailParams = new EmailParams()
        .setFrom(new Sender(senderEmail, siteConfig.name))
        .setTo([new Recipient(superadminEmail, "Superadmin")])
        .setSubject(`[Enterprise Inquiry] ${name || "Unknown"} — ${planId || "N/A"}`)
        .setHtml(
          `<div style="font-family:sans-serif;padding:20px;">` +
            `<h3>Enterprise Inquiry Baru</h3>` +
            `<p><b>Nama:</b> ${name || "-"}</p>` +
            `<p><b>Email:</b> ${email || "-"}</p>` +
            `<p><b>Plan:</b> ${planId || "-"}</p>` +
            `<p><b>Pesan:</b></p><p>${message || "-"}</p>` +
            `</div>`
        );
      await mailersend.email.send(emailParams);
    } catch (emailErr: any) {
      console.warn("[enterprise] Gagal kirim email notifikasi:", emailErr?.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Enterprise Inquiry API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
