import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Impor modul dispatcher & kamus template email internasional baru kita
import { sendEmail } from "@/lib/mail/dispatcher";
import { generateInviteEmailHTML, emailTranslations } from "@/lib/mail/templates";
import { LanguageType } from "@/components/providers/language-provider";

// Inisialisasi klien Supabase admin/server untuk mencatat database undangan
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(req: Request) {
  try {
    const { email, role, orgName } = await BalancedBody(req);

    async function BalancedBody(request: Request) {
      return await request.json();
    }

    if (!email || !role) {
      return NextResponse.json({ error: "Missing email or role" }, { status: 400 });
    }

    // 1. Deteksi Bahasa Aktif Pengirim (Inviter) dari Sesi Cookies Server secara Aman
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          }
        }
      }
    );

    const {
      data: { user }
    } = await serverSupabase.auth.getUser();
    const inviterLanguage = (user?.user_metadata?.language as LanguageType) || "English";

    // 2. Dapatkan ID organisasi (tenant_id) berdasarkan nama organisasi
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

    // 3. Kelola penyimpanan data undangan ke tabel 'invitations' secara manual
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

    // 4. Meng-encode data parameter ke Base64 untuk URL Join
    const tokenData = JSON.stringify({ email, role, orgName });
    const token = Buffer.from(tokenData).toString("base64");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const joinLink = `${appUrl}/join?token=${token}`;

    // 5. Kompilasi Subjek & Struktur HTML Email dengan Gaya Tailwind-like sesuai Bahasa Aktif
    const t = emailTranslations[inviterLanguage] || emailTranslations.English;
    const subject = `${t.subject}${orgName}`;
    const htmlContent = generateInviteEmailHTML(orgName, role, joinLink, inviterLanguage);

    // 6. Kirim Email Menggunakan Dispatcher Multi-Provider (Membaca .env.local)
    await sendEmail({
      to: email,
      subject,
      html: htmlContent
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Menampilkan error asli di terminal VS Code/CMD Anda
    console.error("CRITICAL_INVITE_API_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
