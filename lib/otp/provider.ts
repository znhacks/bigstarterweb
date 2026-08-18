// lib/otp/provider.ts
//
// Provider abstraction utk pengiriman OTP multi-channel.
// Developer boilerplate: utk menambah provider WA/SMS baru, implementasikan
// interface OtpChannelProvider di bawah & daftarkan di getOtpProvider().

import type { OtpChannel, OtpPurpose } from "@/config/otp";
import { sendEmail } from "@/lib/mail/dispatcher";

export interface OtpChannelProvider {
  /** Kirim kode OTP ke target. Throw bila gagal/provider tak terkonfigurasi. */
  send(opts: { target: string; code: string; purpose: OtpPurpose }): Promise<void>;
}

// ---------------------------------------------------------------------------
// EMAIL — memakai lib/mail/dispatcher.ts (Resend / MailerSend / Nodemailer via MAIL_PROVIDER)
// ---------------------------------------------------------------------------
class EmailOtpProvider implements OtpChannelProvider {
  async send({ target, code, purpose }: { target: string; code: string; purpose: OtpPurpose }) {
    const subject =
      purpose === "login" || purpose === "password_reset"
        ? `Your verification code: ${code}`
        : `Verification code: ${code}`;
        
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n\n[DEV MODE - OTP DEBUG] KODE OTP UNTUK ${target} ADALAH: ${code}\n\n`);
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2>Your verification code</h2>
        <p>Use the code below to continue. It expires in 10 minutes.</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px;text-align:center;
                  background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0">${code}</p>
        <p style="color:#666;font-size:12px">If you did not request this, you can ignore this email.</p>
      </div>`;
    await sendEmail({ to: target, subject, html });
  }
}

// ---------------------------------------------------------------------------
// WHATSAPP — STUB terdokumentasi.
// Aktifkan: set OTP_CONFIG.channels.wa=true + WA_PROVIDER env (mis. "fonnte"|"wablas"|"twilio")
// + implementasikan pengiriman di bawah (contoh: HTTP POST ke API provider pilihan Anda).
// ---------------------------------------------------------------------------
class WhatsAppOtpProvider implements OtpChannelProvider {
  async send({ target, code }: { target: string; code: string; purpose: OtpPurpose }) {
    const provider = process.env.WA_PROVIDER;
    if (!provider) {
      throw new Error("WhatsApp OTP: WA_PROVIDER belum dikonfigurasi. Implementasikan di lib/otp/provider.ts.");
    }
    // TODO(developer): implementasi sesuai provider (Fonnte/WaBlas/Twilio WA).
    // Contoh pola:
    //   await fetch(`https://api.${provider}.com/send`, { method:"POST", body: JSON.stringify({ to: target, message: `Kode OTP Anda: ${code}` }) });
    void target;
    void code;
    throw new Error(`WhatsApp OTP provider '${provider}' belum diimplementasikan (stub).`);
  }
}

// ---------------------------------------------------------------------------
// SMS — STUB terdokumentasi.
// Aktifkan: set OTP_CONFIG.channels.sms=true + SMS_PROVIDER env (mis. "twilio"|"messagebird")
// + implementasikan pengiriman (biasanya via SDK provider).
// ---------------------------------------------------------------------------
class SmsOtpProvider implements OtpChannelProvider {
  async send({ target, code }: { target: string; code: string; purpose: OtpPurpose }) {
    const provider = process.env.SMS_PROVIDER;
    if (!provider) {
      throw new Error("SMS OTP: SMS_PROVIDER belum dikonfigurasi. Implementasikan di lib/otp/provider.ts.");
    }
    // TODO(developer): implementasi sesuai provider (Twilio/MessageBird/dll).
    void target;
    void code;
    throw new Error(`SMS OTP provider '${provider}' belum diimplementasikan (stub).`);
  }
}

const PROVIDERS: Record<OtpChannel, OtpChannelProvider> = {
  email: new EmailOtpProvider(),
  wa: new WhatsAppOtpProvider(),
  sms: new SmsOtpProvider()
};

/** Factory: pilih provider berdasarkan channel. */
export function getOtpProvider(channel: OtpChannel): OtpChannelProvider {
  return PROVIDERS[channel];
}
