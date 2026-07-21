"use client";

import { useThemeConfig } from "@/components/active-theme";
import { Button } from "@/components/ui/button";
import { DEFAULT_THEME } from "@/lib/themes";
import { useTranslations } from "next-intl";

export function ResetThemeButton() {
  const { resetTheme } = useThemeConfig();
  const t = useTranslations("component.theme-customizer");

  return (
    <Button className="mt-4 w-full" onClick={resetTheme}>
      {t("reset")}
    </Button>
  );
}
