import { NextResponse } from "next/server";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { checkSeatLimit } from "@/lib/billing/enforcer";
import { getUser } from "@/lib/auth";
import { resolveTenantPermissions } from "@/lib/billing/tenant-auth";
import { signInviteToken } from "@/lib/invite/token";
import { createClient } from "@/lib/supabase/server";
import { roleRepository } from "@/supabase/repositories/roles";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { invitationRepository } from "@/supabase/repositories/invitations";
import { hasPermission } from "@/modules/rbac/shared";
import { PERMISSIONS } from "@/modules/rbac/shared";

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || ""
});

export async function POST(req: Request) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, roleId, orgName } = await BalancedBody(req);

    async function BalancedBody(request: Request) {
      return await request.json();
    }

    if (!email || !roleId || !orgName) {
      return NextResponse.json({ error: "Missing email, roleId, or orgName" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: roleData, error: roleError } = await (
      await roleRepository(supabase)
    )
      .query()
      .select("name")
      .eq("id", roleId)
      .maybeSingle();

    if (roleError || !roleData) {
      return NextResponse.json({ error: "Role tidak valid." }, { status: 400 });
    }
    const role = roleData.name;

    const { data: tenantData, error: tenantError } = await (
      await tenantRepository(supabase)
    )
      .query()
      .select("id")
      .eq("name", orgName)
      .single();

    if (tenantError || !tenantData) {
      return NextResponse.json(
        { error: `Organisasi '${orgName}' tidak ditemukan di database.` },
        { status: 404 }
      );
    }

    const permissions = await resolveTenantPermissions(supabase, user.id, tenantData.id);
    const canInvite = hasPermission(permissions, PERMISSIONS.membersInvite);
    if (!canInvite) {
      return NextResponse.json(
        { error: "Forbidden: hanya pengguna dengan permission members.invite yang dapat mengundang anggota." },
        { status: 403 }
      );
    }

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

    const invitationRepo = await invitationRepository(supabase);
    const { data: existingInvite } = await invitationRepo
      .query()
      .select("id")
      .eq("tenant_id", tenantData.id)
      .eq("email", email)
      .maybeSingle();

    let invitationId: string;
    if (existingInvite) {
      const { error: updateError } = await invitationRepo
        .query()

        .update({ role_id: roleId, invited_by: user.id })
        .eq("id", existingInvite.id);

      if (updateError) throw updateError;
      invitationId = existingInvite.id;
    } else {
      const { data: inserted, error: insertError } = await invitationRepo
        .query()
        .insert({
          tenant_id: tenantData.id,
          email: email.trim().toLowerCase(),
          role_id: roleId,
          invited_by: user.id
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      invitationId = inserted.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const token = signInviteToken(invitationId, email.trim().toLowerCase(), orgName, role);
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

    // 5. Konfigurasi Pengirim MailerSend
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
    console.error("CRITICAL_INVITE_API_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
