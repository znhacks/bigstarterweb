"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Palette, Settings, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const pathname = usePathname();

  const isGeneralActive = pathname?.includes("/settings/general");
  const isAppearancesActive = pathname?.includes("/settings/appearance");
  const isSecurityActive = pathname?.includes("/settings/security");
  const isNotificationsActive = pathname?.includes("/settings/notifications");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
                href="/settings/appearance"
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  isAppearancesActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <Palette className="h-4 w-4 shrink-0" />
                <span>{t("menu.appearance")}</span>
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

              <Link
                href="/settings/notifications"
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  isNotificationsActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <Bell className="h-4 w-4 shrink-0" />
                <span>{t("menu.notifications")}</span>
              </Link>
            </nav>
          </Card>
        </div>

        <div className="md:col-span-3">{children}</div>
      </div>
    </div>
  );
}
