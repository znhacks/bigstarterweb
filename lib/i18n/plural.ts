import { getLocaleMeta } from "@/config/i18n-culture";

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * Mendapatkan tipe kategori plural berdasarkan locale dan jumlah item.
 */
export function getPluralCategory(count: number, locale: string): PluralCategory {
  const meta = getLocaleMeta(locale);
  const pluralRules = new Intl.PluralRules(meta.bcp47);
  return pluralRules.select(count) as PluralCategory;
}

/**
 * Menyelesaikan string hasil berdasarkan aturan pluralisasi 6-form (terutama untuk Arab).
 * keys di dalam object opsional, jika key tertentu tidak ada, akan otomatis mundur ke "other".
 */
export function formatPlural(
  count: number,
  locale: string,
  translations: {
    zero?: string;
    one?: string;
    two?: string;
    few?: string;
    many?: string;
    other: string;
  }
): string {
  const category = getPluralCategory(count, locale);
  const template = translations[category] ?? translations["other"];
  return template.replace("{count}", formatNumber(count, locale));
}

function formatNumber(value: number, locale: string): string {
  const meta = getLocaleMeta(locale);
  return new Intl.NumberFormat(meta.bcp47).format(value);
}
