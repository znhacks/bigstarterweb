import { getLocaleMeta } from "@/config/i18n-culture";

export function getCountryName(countryCode: string, locale: string): string {
  const meta = getLocaleMeta(locale);
  try {
    const displayNames = new Intl.DisplayNames([meta.bcp47], { type: "region" });
    return displayNames.of(countryCode.toUpperCase()) ?? countryCode;
  } catch {
    return countryCode;
  }
}

export function getCountryList(locale: string): { code: string; name: string }[] {
  // Daftar negara umum yang digunakan
  const commonCountries = ["US", "ID", "SA", "GB", "SG", "AU", "MY", "JP", "AE", "CA"];
  return commonCountries
    .map((code) => ({
      code,
      name: getCountryName(code, locale)
    }))
    .sort((a, b) => compareStrings(a.name, b.name, locale));
}

import { compareStrings } from "./collator";
