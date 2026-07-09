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

export function formatRelativeTime(
  dateStr: string | Date,
  locale: string,
  timeZone?: string // Tambahkan parameter kontrol zona waktu
): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();

  // Selisih milidetik Epoch UTC bersifat absolut & sama di seluruh dunia
  const diffInMs = date.getTime() - now.getTime();
  const sign = Math.sign(diffInMs);
  const absMs = Math.abs(diffInMs);

  const absSeconds = Math.floor(absMs / 1000);
  const absMinutes = Math.floor(absSeconds / 60);
  const absHours = Math.floor(absMinutes / 60);
  const absDays = Math.floor(absHours / 24);

  const meta = getLocaleMeta(locale);
  try {
    const rtf = new Intl.RelativeTimeFormat(meta.bcp47, { numeric: "auto" });

    // 1. Rentang waktu di bawah 24 jam penuh (Relatif)
    if (absHours < 24) {
      if (absSeconds < 60) {
        return rtf.format(absSeconds * sign, "second");
      }
      if (absMinutes < 60) {
        return rtf.format(absMinutes * sign, "minute");
      }
      return rtf.format(absHours * sign, "hour");
    }

    // 2. Tepat 1 hari (kemarin atau besok)
    if (absDays === 1) {
      return rtf.format(1 * sign, "day");
    }

    // 3. Rentang WhatsApp: Nama Hari (Rabu, Senin, dsb) dikonversi sesuai Timezone pengguna
    if (sign === -1 && absDays < 7) {
      const weekdayFormatter = new Intl.DateTimeFormat(meta.bcp47, {
        weekday: "long",
        timeZone // SOLUSI: Konversi batas penanggalan ke zona waktu lokal pengguna
      });
      return weekdayFormatter.format(date);
    }

    // 4. Di atas 7 hari -> Kalender absolut disesuaikan Timezone pengguna
    if (sign === -1 || absDays >= 7) {
      const dateFormatter = new Intl.DateTimeFormat(meta.bcp47, {
        dateStyle: "medium",
        timeZone // SOLUSI: Konversi batas penanggalan ke zona waktu lokal pengguna
      });
      return dateFormatter.format(date);
    }

    return rtf.format(absDays * sign, "day");
  } catch {
    return date.toLocaleDateString(meta.bcp47, { timeZone });
  }
}
