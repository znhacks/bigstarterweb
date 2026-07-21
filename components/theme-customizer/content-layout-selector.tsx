"use client";

import { Label } from "@/components/ui/label";
import { useThemeConfig } from "@/components/active-theme";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTranslations } from "next-intl";

export function ContentLayoutSelector() {
  const { theme, setTheme } = useThemeConfig();
  const t = useTranslations("component.theme-customizer.layout");

  return (
    <div className="hidden flex-col gap-3 lg:flex">
      <Label>{t("title")}</Label>
      <ToggleGroup
        className="w-full"
        value={theme.contentLayout}
        type="single"
        onValueChange={(value) => setTheme({ ...theme, contentLayout: value as any })}>
        <ToggleGroupItem variant="outline" className="grow" value="full">
          {t("full")}
        </ToggleGroupItem>
        <ToggleGroupItem variant="outline" className="grow" value="centered">
          {t("centered")}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
