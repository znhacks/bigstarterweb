// config/payment.ts
//
// Sumber config billing tunggal. Semua toggle billing/subscription di satu tempat.

export const billingConfig = {
  /**
   * Siapa pemilik langganan.
   * - "tenant" (default): subscription 1:1 per tenant (behavior saat ini).
   * - "user": subscription di-scope per user (satu langganan berlaku lintas tenant si user).
   */
  billingAttachedTo: "tenant" as "tenant" | "user",

  /**
   * true = TIDAK ada free plan. User tanpa subscription aktif di-block (gating menolak
   * & paywall menutup akses). false = tier gratis tersedia (fallback plan "free").
   */
  requireActiveSubscription: false,

  /**
   * Provider TUNGGAL yang tampil ke user (transparan — user tak melihat/memilih gateway).
   * Developer cukup ganti nilai ini (atau set env NEXT_PUBLIC_ACTIVE_PAYMENT_PROVIDER) untuk
   * berganti gateway; semua adapter tetap terdaftar di PaymentFactory → swap tanpa setup ulang.
   */
  activeProvider: (
    process.env.NEXT_PUBLIC_ACTIVE_PAYMENT_PROVIDER?.trim().toLowerCase() ||
    process.env.NEXT_PUBLIC_ENABLED_PAYMENT_PROVIDERS?.split(",")[0]?.trim().toLowerCase() ||
    "mayar"
  ) as string
};
