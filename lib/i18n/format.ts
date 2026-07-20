// /lib/i18n/format.ts
import { getLocaleMeta } from "@/config/i18n-culture";

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  const meta = getLocaleMeta(locale);
  try {
    return new Intl.NumberFormat(meta.bcp47, {
      numberingSystem: meta.numberingSystem, // SOLUSI: Ambil murni dari metadata
      ...options
    }).format(value);
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

  const hasIndividualFields =
    options &&
    ("year" in options ||
      "month" in options ||
      "day" in options ||
      "hour" in options ||
      "minute" in options ||
      "second" in options);

  const defaultOptions: Intl.DateTimeFormatOptions = hasIndividualFields
    ? {}
    : { dateStyle: "medium" };

  try {
    return new Intl.DateTimeFormat(meta.bcp47, {
      ...defaultOptions,
      numberingSystem: meta.numberingSystem, // SOLUSI: Ambil murni dari metadata
      ...options
    }).format(d);
  } catch {
    // Fallback otomatis menggunakan format locale bawaan yang aman
    return d.toLocaleDateString(meta.bcp47, {
      numberingSystem: meta.numberingSystem
    });
  }
}

export function formatRelativeTime(
  dateStr: string | Date,
  locale: string,
  timeZone?: string
): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();

  const diffInMs = date.getTime() - now.getTime();
  const sign = Math.sign(diffInMs);
  const absMs = Math.abs(diffInMs);

  const absSeconds = Math.floor(absMs / 1000);
  const absMinutes = Math.floor(absSeconds / 60);
  const absHours = Math.floor(absMinutes / 60);
  const absDays = Math.floor(absHours / 24);

  const meta = getLocaleMeta(locale);
  try {
    const rtf = new Intl.RelativeTimeFormat(meta.bcp47, {
      numeric: "auto",
      numberingSystem: meta.numberingSystem // SOLUSI: Ambil murni dari metadata
    } as any);

    if (absHours < 24) {
      if (absSeconds < 60) {
        return rtf.format(absSeconds * sign, "second");
      }
      if (absMinutes < 60) {
        return rtf.format(absMinutes * sign, "minute");
      }
      return rtf.format(absHours * sign, "hour");
    }

    if (absDays === 1) {
      return rtf.format(1 * sign, "day");
    }

    if (sign === -1 && absDays < 7) {
      const weekdayFormatter = new Intl.DateTimeFormat(meta.bcp47, {
        weekday: "long",
        timeZone,
        numberingSystem: meta.numberingSystem // SOLUSI: Ambil murni dari metadata
      });
      return weekdayFormatter.format(date);
    }

    if (sign === -1 || absDays >= 7) {
      const dateFormatter = new Intl.DateTimeFormat(meta.bcp47, {
        dateStyle: "medium",
        timeZone,
        numberingSystem: meta.numberingSystem // SOLUSI: Ambil murni dari metadata
      });
      return dateFormatter.format(date);
    }

    return rtf.format(absDays * sign, "day");
  } catch {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return d.toLocaleDateString(meta.bcp47, {
      timeZone,
      numberingSystem: meta.numberingSystem
    });
  }
}
