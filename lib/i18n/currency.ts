// /lib/i18n/currency.ts
import { getLocaleMeta, getDisplayCurrency } from "@/config/i18n-culture";

interface FormatCurrencyOptions {
  currencyCode?: string; // override default display currency
  options?: Intl.NumberFormatOptions;
}

/**
 * Memformat angka menjadi representasi nilai mata uang lokal.
 */
export function formatCurrency(
  amount: number,
  locale: string,
  config: FormatCurrencyOptions = {}
): string {
  const meta = getLocaleMeta(locale);
  const targetCurrency = config.currencyCode ?? getDisplayCurrency(locale);

  try {
    return new Intl.NumberFormat(meta.bcp47, {
      style: "currency",
      currency: targetCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...config.options
    }).format(amount);
  } catch (error) {
    console.error("Gagal memformat mata uang:", error);
    return `${targetCurrency} ${amount.toFixed(2)}`;
  }
}
