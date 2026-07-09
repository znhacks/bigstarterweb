import { getLocaleMeta } from "@/config/i18n-culture";

/**
 * Membersihkan nomor telepon agar hanya tersisa angka dan karakter '+' di awal.
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

/**
 * Mengambil default ISO country berdasarkan locale untuk phone input.
 */
export function getDefaultPhoneCountry(locale: string): string {
  const meta = getLocaleMeta(locale);
  return meta.phoneCountry;
}
