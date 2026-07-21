// lib/i18n/user-currency.ts
//
// Per-user display currency (driven by country at register/onboarding, stored in
// profiles.currency + mirrored to USER_CURRENCY cookie). Falls back to locale-based.

import { APP_BASE_CURRENCY } from "@/config/billing-rates";

export const USER_CURRENCY_COOKIE = "USER_CURRENCY";

/** Baca cookie USER_CURRENCY (client-side, sync). Fallback APP_BASE_CURRENCY (bukan locale). */
export function getUserCurrencyClient(locale?: string): string {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)USER_CURRENCY=([^;]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return APP_BASE_CURRENCY;
}

/**
 * Baca currency user server-side (via next/headers cookies). Dynamic import agar
 * modul ini aman diimpor di client bundle. Fallback locale-based.
 */
export async function getUserCurrencyServer(locale?: string): Promise<string> {
  if (typeof window !== "undefined") return getUserCurrencyClient(locale);
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const v = store.get(USER_CURRENCY_COOKIE)?.value;
    if (v) return v;
  } catch {
    // ignore
  }
  return APP_BASE_CURRENCY;
}

/** Set cookie USER_CURRENCY (client-side). */
export function setUserCurrencyCookie(currency: string) {
  if (typeof document !== "undefined") {
    document.cookie = `${USER_CURRENCY_COOKIE}=${currency};path=/;max-age=31536000;SameSite=Lax`;
  }
}
