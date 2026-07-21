// app/(auth)/(users)/settings/appearance/view.tsx
"use client";

import { useThemeConfig } from "@/components/active-theme";
import { ThemeCustomizerPanel } from "@/components/theme-customizer/panel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

export function AppearanceView() {
  const { themeSource } = useThemeConfig();
  const t = useTranslations("settings.appearance");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 py-8">
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("userDesc")}</p>
        <Badge variant="outline" className="mt-2">
          {themeSource === "user"
            ? t("sourceUser")
            : themeSource === "tenant"
              ? t("sourceTenant")
              : t("sourceDefault")}
        </Badge>
      </div>

      <Card className="border-border/80 rounded-2xl border shadow-sm">
        <CardContent className="space-y-6 p-6">
          <ThemeCustomizerPanel />
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">{t("userHelp")}</p>
    </div>
  );
}
