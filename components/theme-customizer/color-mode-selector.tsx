"use client";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

export function ColorModeSelector() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("component.theme-customizer.theme-mode");

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="roundedCorner">{t("title")}</Label>
      <ToggleGroup
        className="w-full"
        value={theme}
        type="single"
        onValueChange={(value) => setTheme(value)}>
        <ToggleGroupItem variant="outline" className="grow" value="light">
          {t("light")}
        </ToggleGroupItem>
        <ToggleGroupItem variant="outline" className="grow" value="dark">
          {t("dark")}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
