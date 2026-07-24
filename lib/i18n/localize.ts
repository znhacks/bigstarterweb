// lib/i18n/localize.ts
//
// Util lokal nilai terlokalisasi dgn rantai fallback robust.
// Dipakai bersama oleh billing/logic.ts & superadmin/plans/logic.tsx (sebelumnya duplikat).

const DEFAULT_LOCALE = "en";

function isNonEmpty<T>(v: T): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * Ambil nilai terlokalisasi dengan fallback berlapis:
 *   field[locale] → field[fallback(default "en")] → nilai non-kosong pertama dari
 *   key mana pun → string mentah.
 *
 * Mencegah render kosong / `[object Object]` saat sebuah plan hanya diisi satu
 * bahasa (mis. hanya "id") lalu ditampilkan dalam locale lain (mis. "ar"/"en").
 */
export function getLocalizedValue<T>(
  field: Record<string, T> | T | undefined | null,
  locale: string,
  fallback: string = DEFAULT_LOCALE
): T {
  if (field === null || field === undefined) return field as T;

  if (typeof field === "object" && !Array.isArray(field)) {
    const map = field as Record<string, T>;

    // 1) locale aktual (skip string kosong / array kosong)
    if (locale && map[locale] !== undefined && isNonEmpty(map[locale])) {
      return map[locale];
    }
    // 2) locale default
    if (map[fallback] !== undefined && isNonEmpty(map[fallback])) {
      return map[fallback];
    }
    // 3) nilai non-kosong pertama dari key mana pun
    for (const key of Object.keys(map)) {
      const v = map[key];
      if (isNonEmpty(v)) return v;
    }
    // 4) nilai pertama apa adanya (meski kosong) supaya tidak return object utuh
    const first = Object.values(map)[0];
    if (first !== undefined) return first;
  }

  return field as T;
}
