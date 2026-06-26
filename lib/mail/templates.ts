// lib/mail/templates.ts
import { LanguageType } from "@/components/providers/language-provider";

export const emailTranslations = {
  English: {
    subject: "Invitation to join ",
    title: "Organization Invitation",
    salutation: "Hello,",
    body: "You have been invited to join the organization <strong style='color: #000;'>{orgName}</strong> as an <strong style='color: #000;'>{role}</strong>.",
    btn: "Accept Invitation & Join",
    ignore: "If you did not expect this invitation, you can safely ignore this email."
  },
  "Bahasa Indonesia": {
    subject: "Undangan bergabung ke ",
    title: "Undangan Organisasi",
    salutation: "Halo,",
    body: "Anda telah diundang untuk bergabung dengan organisasi <strong style='color: #000;'>{orgName}</strong> sebagai <strong style='color: #000;'>{role}</strong>.",
    btn: "Terima Undangan & Gabung",
    ignore: "Jika Anda merasa tidak melakukan pendaftaran ini, abaikan email ini."
  },
  Español: {
    subject: "Invitación para unirse a ",
    title: "Invitación de Organización",
    salutation: "Hola,",
    body: "Has sido invitado a unirse a la organización <strong style='color: #000;'>{orgName}</strong> como <strong style='color: #000;'>{role}</strong>.",
    btn: "Aceptar Invitación y Unirse",
    ignore: "Si no esperaba esta invitación, puede ignorar este correo de manera segura."
  }
};

// Fungsi Generator Template HTML dengan gaya desain modern Tailwind-like
export function generateInviteEmailHTML(
  orgName: string,
  role: string,
  joinLink: string,
  lang: LanguageType = "English"
) {
  const t = emailTranslations[lang] || emailTranslations.English;

  const bodyText = t.body.replace("{orgName}", orgName).replace("{role}", role);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${t.title}</title>
      </head>
      <body style="background-color: #f9fafb; margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="background-color: #ffffff; max-width: 480px; margin: 0 auto; padding: 32px; border-radius: 16px; border: 1px solid #f3f4f6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Logo area (Optional) -->
          <div style="margin-bottom: 24px; font-weight: 700; font-size: 18px; color: #000000; letter-spacing: -0.025em;">
            ACME SAAS
          </div>
          
          <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; letter-spacing: -0.025em;">
            ${t.title}
          </h2>
          
          <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 8px;">
            ${t.salutation}
          </p>
          
          <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 24px;">
            ${bodyText}
          </p>
          
          <!-- Tombol CTA -->
          <p style="margin: 28px 0; text-align: center;">
            <a href="${joinLink}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; display: inline-block; transition: background-color 0.2s;">
              ${t.btn}
            </a>
          </p>
          
          <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
            ${t.ignore}
          </p>
        </div>
      </body>
    </html>
  `;
}
