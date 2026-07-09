import { getLocaleMeta } from "@/config/i18n-culture";

/**
 * Membandingkan dua buah kata berdasarkan sensitivitas huruf lokal.
 */
export function compareStrings(
  a: string,
  b: string,
  locale: string,
  options?: Intl.CollatorOptions
): number {
  const meta = getLocaleMeta(locale);
  try {
    const collator = new Intl.Collator(meta.bcp47, {
      sensitivity: "base",
      numeric: true,
      ...options
    });
    return collator.compare(a, b);
  } catch {
    return a.localeCompare(b);
  }
}

/**
 * Mengurutkan array string berdasarkan locale aktif.
 */
export function sortLocale(
  array: string[],
  locale: string,
  options?: Intl.CollatorOptions
): string[] {
  return [...array].sort((a, b) => compareStrings(a, b, locale, options));
}
