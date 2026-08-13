import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: [
    "en",
    "id",
    "ja",
    "zh",
    "ko",
    "fr",
    "de",
    "es",
    "pt",
    "ru",
    "it",
    "th",
    "vi",
    "tr"
  ],
  defaultLocale: "en",

  localePrefix: "never"
});

export const LOCALE_COOKIE = "NEXT_LOCALE";
