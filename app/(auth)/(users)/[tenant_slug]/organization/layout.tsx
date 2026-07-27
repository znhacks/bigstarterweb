"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { CreditCard, Palette, ReceiptText, Settings, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const tenantSlug = params?.tenant_slug as string | undefined;
  const t = useTranslations("organization");

  const isGeneralActive = pathname?.includes("/organization/general");
  const isMembersActive = pathname?.includes("/organization/member");
  const isBillingActive = pathname?.includes("/organization/pricing");
  const isHistoryBillingActive = pathname?.includes("/organization/history-billing");
  const isAppearancesActive = pathname?.includes("/organization/appearance");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      {}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      {}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {}
        <div className="md:col-span-1">
          <Card className="overflow-hidden p-2">
            <nav className="flex flex-row gap-1 md:flex-col">
              {}
              <Link
                href={`/${tenantSlug}/organization/general`}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  isGeneralActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <Settings className="h-4 w-4 shrink-0" />
                <span>{t("menu.general")}</span>
              </Link>

              {}
              <Link
                href={`/${tenantSlug}/organization/member`}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  isMembersActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <Users className="h-4 w-4 shrink-0" />
                <span>{t("menu.member")}</span>
              </Link>

              {}
              <Link
                href={`/${tenantSlug}/organization/pricing`}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  isBillingActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <CreditCard className="h-4 w-4 shrink-0" />
                <span>{t("menu.billing")}</span>
              </Link>

              <Link
                href={`/${tenantSlug}/organization/history-billing`}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  isHistoryBillingActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <ReceiptText className="h-4 w-4 shrink-0" />
                <span>{t("menu.history-billing")}</span>
              </Link>

              <Link
                href={`/${tenantSlug}/organization/appearance`}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  isAppearancesActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <Palette className="h-4 w-4 shrink-0" />
                <span>{t("menu.appearance")}</span>
              </Link>
            </nav>
          </Card>
        </div>

        {}
        <div className="md:col-span-3">{children}</div>
      </div>
    </div>
  );
}
