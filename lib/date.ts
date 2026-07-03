// lib/date.ts

/**
 * Memformat tanggal UTC dari database ke waktu lokal pilihan pengguna.
 * @param date Tanggal UTC (string atau Date)
 * @param timeZone Zona waktu tujuan (contoh: 'Asia/Jakarta')
 * @param locale Kode bahasa (contoh: 'id', 'en', 'ar')
 */
export function formatToUserTimezone(
  date: string | Date,
  timeZone: string = "UTC",
  locale: string = "en"
): string {
  const parsedDate = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(parsedDate);
}

/**
 * Menghitung dan menampilkan waktu relatif (Time Ago) secara multi-bahasa.
 * @param date Tanggal UTC (string atau Date)
 * @param locale Kode bahasa (contoh: 'id', 'en', 'ar')
 */
export function formatRelativeTime(date: string | Date, locale: string = "en"): string {
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - parsedDate.getTime()) / 1000);

  // Intl.RelativeTimeFormat mendukung otomatis Bahasa Arab, Indonesia, Inggris, dll.
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const units: { unit: Intl.RelativeTimeFormatUnit; amount: number }[] = [
    { unit: "year", amount: 31536000 },
    { unit: "month", amount: 2592000 },
    { unit: "day", amount: 86400 },
    { unit: "hour", amount: 3600 },
    { unit: "minute", amount: 60 },
    { unit: "second", amount: 1 }
  ];

  for (const { unit, amount } of units) {
    if (diffInSeconds >= amount || unit === "second") {
      const value = Math.floor(diffInSeconds / amount);
      return rtf.format(-value, unit);
    }
  }
  return "";
}
