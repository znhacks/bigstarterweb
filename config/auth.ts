// config/auth.ts
//
// Toggles metode autentikasi (raw Supabase Auth). Set false untuk menyembunyikan/
// menonaktifkan metode tsb di UI (login/register) & API (OTP/magic).
// Metode channel OTP (email/wa/sms) & durasi di config/otp.ts.

export const AUTH_FEATURES = {
  /** Email + password. */
  enablePassword: true,
  /** Kode OTP email (engine custom; lihat config/otp.ts utk channel & durasi). */
  enablePasswordlessOtp: true,
  /** Magic link via email. */
  enableMagicLink: true,
  /** OAuth Google. */
  enableGoogle: true,
  /** OAuth GitHub (butuh GitHub OAuth app terdaftar di provider Supabase). */
  enableGithub: false,
  /** Passkey / WebAuthn (eksperimental). */
  enablePasskey: true,
  /** Lupa password (reset via email). */
  enablePasswordReset: true
};

/** Apakah ada setidaknya satu metode OAuth/passkey ditampilkan (utk divider "continue with"). */
export const hasSocialAuth =
  AUTH_FEATURES.enableGoogle ||
  AUTH_FEATURES.enableGithub ||
  AUTH_FEATURES.enablePasskey;
