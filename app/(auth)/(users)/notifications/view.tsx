"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { BellOff, CheckCheck } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function InboxView() {
  const t = useTranslations("notifications");
  const tRoot = useTranslations();
  const { items, unread, loading, markRead, markAllRead } = useNotifications(50);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");

  const shown = filter === "unread" ? items.filter((i) => !i.is_read) : items;

  const categoryLabel = (id: string) => {
    try {
      return tRoot(`notifications.category.${id}`);
    } catch {
      return id;
    }
  };

  const handleClick = (id: string, isRead: boolean, link: string | null) => {
    if (!isRead) markRead(id);
    // navigasi ditangani oleh <Link> bila ada link
    return link ? link : undefined;
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("inbox.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {unread > 0 ? `${unread} ${t("inbox.filterUnread").toLowerCase()}` : t("inbox.empty")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-card inline-flex rounded-md border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded px-3 py-1 transition-colors",
                filter === "all" ? "bg-secondary text-foreground" : "text-muted-foreground"
              )}>
              {t("inbox.filterAll")}
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "rounded px-3 py-1 transition-colors",
                filter === "unread" ? "bg-secondary text-foreground" : "text-muted-foreground"
              )}>
              {t("inbox.filterUnread")}
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="size-4" />
            {t("inbox.markAllRead")}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            {t("inbox.empty")}
          </div>
        ) : shown.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-16 text-center">
            <BellOff className="size-8" />
            <p className="text-sm">{t("inbox.empty")}</p>
          </div>
        ) : (
          shown.map((item) => {
            const inner = (
              <div
                className={cn(
                  "bg-card flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/5",
                  !item.is_read && "border-primary/30 bg-primary/5"
                )}>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {categoryLabel(item.category)}
                    </Badge>
                    {!item.is_read && (
                      <span className="bg-primary size-2 shrink-0 rounded-full" />
                    )}
                  </div>
                  <div className="text-sm font-medium">{item.title}</div>
                  {item.body ? (
                    <p className="text-muted-foreground text-xs whitespace-pre-wrap">{item.body}</p>
                  ) : null}
                  <p className="text-muted-foreground text-[11px]">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
            return (
              <div
                key={item.id}
                onClick={() => handleClick(item.id, item.is_read, item.link)}>
                {item.link ? (
                  <Link href={item.link} className="block">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
