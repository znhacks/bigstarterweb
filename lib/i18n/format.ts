import { getLocaleMeta } from "@/config/i18n-culture";

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  const meta = getLocaleMeta(locale);
  try {
    return new Intl.NumberFormat(meta.bcp47, options).format(value);
  } catch {
    return value.toString();
  }
}

export function formatPercent(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  return formatNumber(value, locale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  });
}

export function formatBytes(bytes: number, locale: string): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return `0 B`;

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  const formattedVal = formatNumber(value, locale, {
    maximumFractionDigits: 2
  });

  return `${formattedVal} ${units[i]}`;
}

export function formatDateTime(
  date: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const meta = getLocaleMeta(locale);
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;

  try {
    return new Intl.DateTimeFormat(meta.bcp47, {
      dateStyle: "medium",
      ...options
    }).format(d);
  } catch {
    return d.toDateString();
  }
}
