"use client";

import { DEFAULT_THEME, THEMES } from "@/lib/themes";
import { useThemeConfig } from "@/components/active-theme";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

export function PresetSelector() {
  const { theme, setTheme } = useThemeConfig();
  const t = useTranslations("component.theme-customizer.theme-preset");

  const handlePreset = (value: string) => {
    setTheme({ ...theme, ...DEFAULT_THEME, preset: value as any });
  };

  return (
    <div className="flex flex-col gap-3">
      <Label>{t("title")}</Label>
      <Select value={theme.preset} onValueChange={(value) => handlePreset(value)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a theme" />
        </SelectTrigger>
        <SelectContent align="end">
          {THEMES.map((theme) => (
            <SelectItem key={theme.name} value={theme.value}>
              <div className="flex shrink-0 gap-1">
                {theme.colors.map((color, key) => (
                  <span
                    key={key}
                    className="size-2 rounded-full"
                    style={{ backgroundColor: color }}></span>
                ))}
              </div>
              {theme.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
