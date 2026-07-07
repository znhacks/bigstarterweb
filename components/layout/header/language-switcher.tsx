"use client";

import * as React from "react";
import { useTransition } from "react";
import { Languages, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE } from "@/i18n/routing";

// Daftar bahasa yang didukung
const supportedLocales = [
  { code: "en", label: "English" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ar", label: "العربية" }
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;

    // Karena localePrefix = "never" dan tidak ada segment [locale],
    // URL TIDAK boleh berubah. Lokal disimpan di cookie, lalu halaman
    // di-refresh agar Server Components membaca cookie baru tersebut
    // (lihat i18n/request.ts). router.replace(pathname, {locale}) dari
    // next-intl/navigation justru menambah prefix /id ke URL — itulah
    // bug "mengarah ke /[locale]" sebelumnya.
    document.cookie = `${LOCALE_COOKIE}=${newLocale};path=/;max-age=31536000;SameSite=Lax`;

    // Perbarui <html lang> & <html dir> LANGSUNG di sisi klien.
    // router.refresh() di App Router sering tidak memutakhirkan atribut
    // tag <html> root, sehingga arah layout (termasuk sidebar & flex
    // item yang mengandalkan inheritance `dir`) tidak ikut membalik saat
    // ganti bahasa. Set eksplisit di sini menjamin `dir=rtl` langsung
    // diterapkan tanpa menunggu navigasi penuh.
    const html = document.documentElement;
    html.lang = newLocale;
    html.dir = newLocale === "ar" ? "rtl" : "ltr";

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          className="text-muted-foreground hover:text-foreground relative h-9 w-9 rounded-full transition-colors"
          title="Change Language">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-border/80 min-w-44 rounded-xl border shadow-md">
        {supportedLocales.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => handleLanguageChange(loc.code)}
            className="hover:bg-accent flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium">
            <span>{loc.label}</span>
            {locale === loc.code && <Check className="h-4 w-4 text-emerald-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
