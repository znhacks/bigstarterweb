// lib/i18n/country-defaults.ts
//
// Keterkaitan lokasi (country) <-> i18n culture: memilih negara menyarankan
// mata uang, locale, dan zona waktu default. Pengguna/tenant tetap dapat override.
//
// Sumber: peta ISO negara -> default i18n. Untuk negara di luar peta, kembalikan {} (caller pakai nilai saat ini).
// Data ini dapat diperkaya dari tabel `countries` (kolom currency/timezones) bila perlu.

import { LOCALES, type LocaleCode } from "@/config/i18n-culture";

export interface CountryDefaults {
  currency?: string;
  locale?: LocaleCode;
  timezone?: string;
}

const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  // Southeast Asia
  ID: { currency: "IDR", locale: "id", timezone: "Asia/Jakarta" },
  MY: { currency: "MYR", locale: "en", timezone: "Asia/Kuala_Lumpur" },
  SG: { currency: "SGD", locale: "en", timezone: "Asia/Singapore" },
  TH: { currency: "THB", locale: "en", timezone: "Asia/Bangkok" },
  PH: { currency: "PHP", locale: "en", timezone: "Asia/Manila" },
  VN: { currency: "VND", locale: "en", timezone: "Asia/Ho_Chi_Minh" },
  // Middle East
  SA: { currency: "SAR", locale: "ar", timezone: "Asia/Riyadh" },
  AE: { currency: "AED", locale: "ar", timezone: "Asia/Dubai" },
  EG: { currency: "EGP", locale: "ar", timezone: "Africa/Cairo" },
  // Americas
  US: { currency: "USD", locale: "en", timezone: "America/New_York" },
  CA: { currency: "CAD", locale: "en", timezone: "America/Toronto" },
  MX: { currency: "MXN", locale: "en", timezone: "America/Mexico_City" },
  BR: { currency: "BRL", locale: "en", timezone: "America/Sao_Paulo" },
  // Europe
  GB: { currency: "GBP", locale: "en", timezone: "Europe/London" },
  DE: { currency: "EUR", locale: "en", timezone: "Europe/Berlin" },
  FR: { currency: "EUR", locale: "en", timezone: "Europe/Paris" },
  ES: { currency: "EUR", locale: "en", timezone: "Europe/Madrid" },
  IT: { currency: "EUR", locale: "en", timezone: "Europe/Rome" },
  NL: { currency: "EUR", locale: "en", timezone: "Europe/Amsterdam" },
  // Asia
  JP: { currency: "JPY", locale: "en", timezone: "Asia/Tokyo" },
  KR: { currency: "KRW", locale: "en", timezone: "Asia/Seoul" },
  CN: { currency: "CNY", locale: "en", timezone: "Asia/Shanghai" },
  IN: { currency: "INR", locale: "en", timezone: "Asia/Kolkata" },
  AU: { currency: "AUD", locale: "en", timezone: "Australia/Sydney" },
  NZ: { currency: "NZD", locale: "en", timezone: "Pacific/Auckland" }
};

/**
 * Ambil default i18n (currency/locale/timezone) untuk sebuah negara (ISO alpha-2).
 */
export function getCountryDefaults(countryCode?: string | null): CountryDefaults {
  if (!countryCode) return {};
  return COUNTRY_DEFAULTS[countryCode.toUpperCase()] ?? {};
}

/**
 * Ambil daftar locale yg didukung aplikasi (utk dropdown pilihan bahasa).
 */
export function getSupportedLocales(): LocaleCode[] {
  return [...LOCALES];
}
