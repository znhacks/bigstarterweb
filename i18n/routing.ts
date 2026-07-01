// i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "id", "es"], // Daftar bahasa yang didukung
  defaultLocale: "en",
  // Karena TIDAK ada segment [locale] di App Router, prefix tidak pernah
  // dimasukkan ke URL. Lokal ditentukan via cookie (lihat i18n/request.ts).
  localePrefix: "never"
});

// Nama cookie tempat menyimpan pilihan bahasa pengguna.
// Dipakai bersama oleh i18n/request.ts (baca) dan LanguageSwitcher (tulis).
export const LOCALE_COOKIE = "NEXT_LOCALE";
