"use client";

import * as React from "react";
import Link from "next/link";
import { BellIcon, CheckCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";

const Notifications = () => {
  const isMobile = useIsMobile();
  const t = useTranslations("notifications");
  const tRoot = useTranslations();
  const { items, unread, markAllRead, markRead } = useNotifications(8);

  const recent = items.slice(0, 6);

  const categoryLabel = (id: string) => {
    try {
      return tRoot(`notifications.category.${id}`);
    } catch {
      return id;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" className="relative">
          <BellIcon />
          {unread > 0 && (
            <span className="bg-destructive absolute end-0.5 top-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={isMobile ? "center" : "end"} className="ms-4 w-80 p-0">
        <DropdownMenuLabel className="bg-background dark:bg-muted sticky top-0 z-10 p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-medium">{t("bell.title")}</div>
            <div className="flex items-center gap-1">
              <Button
                variant="link"
                className="h-auto p-0 text-xs"
                size="sm"
                onClick={markAllRead}
                disabled={unread === 0}>
                <CheckCheck className="size-3" />
                {t("bell.markAllRead")}
              </Button>
            </div>
          </div>
        </DropdownMenuLabel>

        <ScrollArea className="h-[350px]">
          {recent.length === 0 ? (
            <div className="text-muted-foreground px-4 py-10 text-center text-xs">
              {t("bell.empty")}
            </div>
          ) : (
            recent.map((item) => (
              <DropdownMenuItem
                key={item.id}
                asChild
                className="group border-b px-4 py-3 last:border-0">
                <Link
                  href={item.link ?? "/notifications"}
                  onClick={() => {
                    if (!item.is_read) markRead(item.id);
                  }}>
                  <div className="flex w-full items-start gap-2">
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[9px]">
                          {categoryLabel(item.category)}
                        </Badge>
                        {!item.is_read && (
                          <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                        )}
                      </div>
                      <div className="truncate text-sm font-medium">{item.title}</div>
                      {item.body ? (
                        <div className="text-muted-foreground line-clamp-1 text-xs">
                          {item.body}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/notifications">{t("bell.viewAll")}</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Notifications;
