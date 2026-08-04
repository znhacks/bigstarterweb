"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Palette, ReceiptText, Settings, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { OrgRouteSegment } from "@/modules/rbac/shared/org-access";

type RouteMeta = {
  href: (tenantSlug: string) => string;
  icon: LucideIcon;
  labelKey: string;
  isActive: (pathname: string | null) => boolean;
};

const ROUTE_META: Record<OrgRouteSegment, RouteMeta> = {
  general: {
    href: (slug) => `/${slug}/organization/general`,
    icon: Settings,
    labelKey: "menu.general",
    isActive: (p) => !!p?.includes("/organization/general")
  },
  member: {
    href: (slug) => `/${slug}/organization/member`,
    icon: Users,
    labelKey: "menu.member",
    isActive: (p) => !!p?.includes("/organization/member")
  },
  "history-billing": {
    href: (slug) => `/${slug}/organization/history-billing`,
    icon: ReceiptText,
    labelKey: "menu.history-billing",
    isActive: (p) => !!p?.includes("/organization/history-billing")
  },
  appearance: {
    href: (slug) => `/${slug}/organization/appearance`,
    icon: Palette,
    labelKey: "menu.appearance",
    isActive: (p) => !!p?.includes("/organization/appearance")
  }
};

export function OrganizationNav({
  tenantSlug,
  routes
}: {
  tenantSlug: string;
  routes: OrgRouteSegment[];
}) {
  const pathname = usePathname();
  const t = useTranslations("organization");

  return (
    <Card className="overflow-hidden p-2">
      <nav className="flex flex-row gap-1 md:flex-col">
        {routes.map((key) => {
          const meta = ROUTE_META[key];
          const active = meta.isActive(pathname);
          const Icon = meta.icon;

          return (
            <Link
              key={key}
              href={meta.href(tenantSlug)}
              className={cn(
                "flex w-full items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}>
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(meta.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </Card>
  );
}
