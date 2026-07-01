// i18n/request.ts
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { routing, LOCALE_COOKIE } from "./routing";

export default getRequestConfig(async () => {
  // Proyek ini TIDAK memakai segment [locale] maupun middleware next-intl,
  // jadi requestLocale selalu undefined. Lokal diambil dari cookie yang
  // ditulis oleh LanguageSwitcher (lihat LOCALE_COOKIE di routing.ts).
  // Ini pola resmi "Provide a locale" dari dokumen next-intl.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  const locale =
    cookieLocale && routing.locales.includes(cookieLocale as (typeof routing.locales)[number])
      ? cookieLocale
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
