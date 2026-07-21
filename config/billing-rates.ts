// config/billing-rates.ts
//
// KONFIGURASI PAJAK & BIAYA GATEWAY — Single Source of Truth.
// Developer: update rate sesuai negara/provider tanpa sentuh kode webhook.
//
// === KONSEP ===
// Tax  = pajak pemerintah/negara (VAT/PPN/GST) — dibayar customer ke developer,
//         lalu developer setorkan ke negara. Mengikuti NEGARA USER (bukan provider).
// Fee  = biaya gateway (Stripe/PayPal/Midtrans charge) — mengikuti PROVIDER.
// Net  = amount_in_idr - tax - fee (uang bersih developer).
// Semua dihitung dalam APP_BASE_CURRENCY (default IDR, developer dapat ubah).

/**
 * APP BASE CURRENCY — mata uang dasar aplikasi (developer-configurable).
 * Dipakai untuk: superadmin revenue/agregasi, fallback display currency,
 * dan basis perhitungan tax/fee/net di webhook.
 * Developer dapat ubah ke "USD", "EUR", dll sesuai kebutuhan boilerplate-nya.
 */
export const APP_BASE_CURRENCY = "IDR";

/**
 * Tax rate per ISO country code (alpha-2).
 * Rate = persen dalam desimal (0.11 = 11%). 0 = tidak kena pajak.
 * Update sesuai regulasi negara yg Anda layani.
 */
export const TAX_RATES: Record<string, number> = {
  ID: 0.11, // Indonesia PPN 11%
  GB: 0.2, // UK VAT 20%
  DE: 0.19, // Germany MwSt 19%
  FR: 0.2, // France TVA 20%
  IT: 0.22, // Italy IVA 22%
  ES: 0.21, // Spain IVA 21%
  NL: 0.21, // Netherlands BTW 21%
  JP: 0.1, // Japan JCT 10%
  SG: 0.09, // Singapore GST 9%
  AE: 0.05, // UAE VAT 5%
  SA: 0.15, // Saudi Arabia VAT 15%
  AU: 0.1, // Australia GST 10%
  NZ: 0.15, // New Zealand GST 15%
  US: 0, // US: tax varies per state (developer tambah state-level bila perlu)
  CA: 0.05 // Canada GST 5% (federal only; provincial bila perlu)
};

/** Ambil tax rate berdasarkan country code. Default 0 bila tak terdaftar. */
export function getTaxRate(countryCode?: string | null): number {
  if (!countryCode) return 0;
  return TAX_RATES[countryCode.toUpperCase()] ?? 0;
}

/**
 * Fee gateway per provider name (lowercase).
 * pct = persen dari amount (0.029 = 2.9%).
 * fixed = biaya tetap per currency code.
 */
export const GATEWAY_FEES: Record<string, { pct: number; fixed: Record<string, number> }> = {
  stripe: { pct: 0.029, fixed: { USD: 0.3, IDR: 5000 } },
  paypal: { pct: 0.034, fixed: { USD: 0.3, IDR: 5000 } },
  braintree: { pct: 0.034, fixed: { USD: 0.3, IDR: 5000 } },
  paddle: { pct: 0.05, fixed: { USD: 0.5, IDR: 7500 } },
  lemonsqueezy: { pct: 0.05, fixed: { USD: 0.5, IDR: 7500 } },
  midtrans: { pct: 0, fixed: { IDR: 4000 } },
  xendit: { pct: 0, fixed: { IDR: 4000 } },
  mayar: { pct: 0, fixed: { IDR: 4000 } }
};

/**
 * Hitung biaya gateway berdasarkan provider + amount + currency.
 * Bila provider tak terdaftar → 0.
 */
export function calculateGatewayFee(
  amount: number,
  provider: string,
  currency: string = "IDR"
): number {
  const fee = GATEWAY_FEES[provider.toLowerCase().trim()];
  if (!fee) return 0;
  const fixed = fee.fixed[currency] ?? fee.fixed["IDR"] ?? 0;
  return amount * fee.pct + fixed;
}
