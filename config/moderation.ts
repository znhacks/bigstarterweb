// config/moderation.ts
//
// Konfigurasi moderasi akun (ban/suspend). Developer dapat dengan mudah
// menambah/mengubah preset durasi ban di array BAN_DURATIONS di bawah.
//
// `ms: null` berarti ban permanen. `ms: number` berarti ban sementara
// (banned_until = now + ms saat ban diterapkan).
//
// Setiap preset:
//   key      — identifier stabil (disimpan acuan; tidak ke DB)
//   labelKey — key terjemahan di bawah namespace "moderation.ban.durations"
//   ms       — durasi dalam milidetik, atau null utk permanen

export interface BanDuration {
  key: string;
  labelKey: string;
  ms: number | null;
}

export const BAN_DURATIONS: BanDuration[] = [
  { key: "1d", labelKey: "ban.durations.1d", ms: 86_400_000 },
  { key: "7d", labelKey: "ban.durations.7d", ms: 7 * 86_400_000 },
  { key: "30d", labelKey: "ban.durations.30d", ms: 30 * 86_400_000 },
  { key: "permanent", labelKey: "ban.durations.permanent", ms: null }
];

/** Default durasi ban bila UI tidak memilih (indeks 0). */
export const DEFAULT_BAN_KEY = BAN_DURATIONS[0]?.key ?? "1d";

/** Cari preset berdasarkan key. */
export function getBanDuration(key: string): BanDuration | undefined {
  return BAN_DURATIONS.find((d) => d.key === key);
}

/**
 * Hitung timestamp banned_until (ISO string) utk durasi tertentu.
 * Mengembalikan null untuk ban permanen.
 */
export function computeBannedUntil(key: string): string | null {
  const dur = getBanDuration(key) ?? getBanDuration(DEFAULT_BAN_KEY);
  if (!dur || dur.ms === null) return null;
  return new Date(Date.now() + dur.ms).toISOString();
}
