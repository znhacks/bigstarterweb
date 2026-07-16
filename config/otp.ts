// config/otp.ts
//
// KONFIGURASI OTP — Single Source of Truth untuk seluruh mesin OTP.
// Developer boilerplate: ubah durasi/limit/channel di sini tanpa menyentuh kode service.
//
// === CHANNEL PROVIDERS ===
// Email: dipakai via lib/mail/dispatcher.ts (MAIL_PROVIDER env: resend|mailersend|nodemailer).
// WhatsApp (WA) & SMS: STUB — implementasi provider sendiri di lib/otp/provider.ts.
//   - WA: set WA_PROVIDER (mis. "fonnte"|"wablas"|"twilio") + key env, lalu lengkapi WhatsAppOtpProvider.
//   - SMS: set SMS_PROVIDER (mis. "twilio"|"messagebird") + key env, lalu lengkapi SmsOtpProvider.

export type OtpChannel = "email" | "wa" | "sms";
export type OtpPurpose =
  | "login"
  | "verify_email"
  | "verify_phone"
  | "password_reset"
  | string; // custom purpose (bebas utk developer lain)

export const OTP_CONFIG = {
  /** Panjang kode (digit angka). */
  codeLength: 6,

  /** Masa berlaku kode (menit). */
  expiryMinutes: 10,

  /** Jeda minimum antar kirim ulang ke target+channel yg sama (detik). */
  resendCooldownSec: 60,

  /** Maksimum percobaan verifikasi salah sebelum kode terkunci. */
  maxAttempts: 5,

  /** Maksimum kirim per target+channel dalam 1 jam (anti-spam). */
  hourlySendCap: 5,

  /** Channel yg diaktifkan. Nonaktif utk menyembunyikan opsi di UI. */
  channels: {
    email: true,
    wa: false, // aktifkan setelah WA_PROVIDER dikonfigurasi
    sms: false // aktifkan setelah SMS_PROVIDER dikonfigurasi
  } as Record<OtpChannel, boolean>
} as const;

/** Cek apakah sebuah channel aktif di konfigurasi. */
export function isOtpChannelEnabled(channel: string): channel is OtpChannel {
  return (
    (channel === "email" || channel === "wa" || channel === "sms") &&
    OTP_CONFIG.channels[channel]
  );
}
