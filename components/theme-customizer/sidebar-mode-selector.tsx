"use client";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSidebar } from "@/components/ui/sidebar";
import { useTranslations } from "next-intl";

export function SidebarModeSelector() {
  const { toggleSidebar } = useSidebar();
  const t = useTranslations("component.theme-customizer.sidebar");

  return (
    <div className="hidden flex-col gap-3 lg:flex">
      <Label>{t("title")}</Label>
      <ToggleGroup className="w-full" type="single" onValueChange={() => toggleSidebar()}>
        <ToggleGroupItem variant="outline" className="grow" value="full">
          {t("default")}
        </ToggleGroupItem>
        <ToggleGroupItem variant="outline" className="grow" value="centered">
          {t("icon")}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
