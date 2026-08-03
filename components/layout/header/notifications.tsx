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
import { notificationIcon, resolveNotificationHref } from "@/lib/notifications/meta";

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
                className="flex h-auto items-center gap-1 p-0 text-xs"
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
            <div className="text-muted-foreground w-max px-4 py-10 text-center text-xs">
              {t("bell.empty")}
            </div>
          ) : (
            recent.map((item) => {
              const Icon = notificationIcon(item.category);
              const href = resolveNotificationHref(item);
              return (
                <DropdownMenuItem
                  key={item.id}
                  asChild
                  className="group flex w-auto cursor-pointer items-start gap-2 border-b px-4 py-3 last:border-0">
                  <Link
                    href={href}
                    onClick={() => {
                      if (!item.is_read) markRead(item.id);
                    }}>
                    <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-0.5 text-start">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="max-w-[120px] truncate text-[9px]">
                          {categoryLabel(item.category)}
                        </Badge>
                        {!item.is_read && (
                          <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                        )}
                      </div>
                      <div className="truncate text-start text-sm font-medium">{item.title}</div>

                      {item.body ? (
                        <div className="text-muted-foreground line-clamp-1 text-start text-xs">
                          {item.body}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })
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
