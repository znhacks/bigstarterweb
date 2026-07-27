import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "id", "ar"],
  defaultLocale: "en",

  localePrefix: "never"
});

export const LOCALE_COOKIE = "NEXT_LOCALE";
