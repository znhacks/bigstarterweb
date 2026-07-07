"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

export default function SettingsLayout({
  children
}: {
  children: React.ReactNode; // Perubahan dari React.Node menjadi React.ReactNode
}) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const pathname = usePathname();

  const isGeneralActive = pathname?.includes("/settings/general");
  const isSecurityActive = pathname?.includes("/settings/security");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      {/* Header Halaman Utama */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      {/* Grid Layout: Menu Samping & Slot Konten Anak */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        {/* Menu Samping */}
        <div className="md:col-span-1">
          <Card className="overflow-hidden p-2">
            <nav className="flex flex-row gap-1 md:flex-col">
              <Link
                href="/settings/general"
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  isGeneralActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <Settings className="h-4 w-4 shrink-0" />
                <span>{t("menu.general")}</span>
              </Link>

              <Link
                href="/settings/security"
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  isSecurityActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <Shield className="h-4 w-4 shrink-0" />
                <span>{t("menu.security")}</span>
              </Link>
            </nav>
          </Card>
        </div>

        {/* Konten Halaman Aktif */}
        <div className="md:col-span-3">{children}</div>
      </div>
    </div>
  );
}
