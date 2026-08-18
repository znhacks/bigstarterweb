import React from "react";
import ThemeSwitch from "@/components/layout/header/theme-switch";
import { LanguageSwitcher } from "@/components/layout/header/language-switcher";

export default function GuestLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeSwitch />
      </div>
      {children}
    </div>
  );
}
