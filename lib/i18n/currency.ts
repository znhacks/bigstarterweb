import { getLocaleMeta } from "@/config/i18n-culture";
import { APP_BASE_CURRENCY } from "@/config/billing-rates";

interface FormatCurrencyOptions {
  currencyCode?: string;
  options?: Intl.NumberFormatOptions;
}

export function formatCurrency(
  amount: number,
  locale: string,
  config: FormatCurrencyOptions = {}
): string {
  const meta = getLocaleMeta(locale);
  const targetCurrency = config.currencyCode ?? APP_BASE_CURRENCY;

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

export function formatTransactionAmount(
  amount: number,
  currency: string | null | undefined,
  amountInIdr: number | null | undefined,
  locale: string
): string {
  const cur = (currency || "IDR").toUpperCase();
  const primary = formatCurrency(amount, locale, { currencyCode: cur });
  if (cur === "IDR" || amountInIdr == null) return primary;

  const idrStr = formatCurrency(amountInIdr, locale, { currencyCode: "IDR" });
  return `${primary} (≈ ${idrStr})`;
}
