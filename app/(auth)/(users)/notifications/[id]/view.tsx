"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  notificationIcon,
  resolveNotificationHref
} from "@/lib/notifications/meta";
import { markReadAction, type InboxItem } from "../action";

export function NotificationDetailView({ item }: { item: InboxItem }) {
  const tRoot = useTranslations();

  // Tandai dibaca saat dibuka.
  React.useEffect(() => {
    if (!item.is_read) {
      markReadAction(item.id).catch(() => {});
    }
  }, [item.id, item.is_read]);

  const Icon = notificationIcon(item.category);
  const categoryLabel = (() => {
    try {
      return tRoot(`notifications.category.${item.category}`);
    } catch {
      return item.category;
    }
  })();

  const href = resolveNotificationHref({
    id: item.id,
    category: item.category,
    source: item.source,
    link: item.link,
    data: item.data
  });
  // Tombol "Buka" hanya jika ada target spesifik (bukan halaman detail ini).
  const hasTarget = href !== `/notifications/${item.id}`;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/notifications">
          <ArrowLeft className="size-4" />
          {tRoot("notifications.inbox.title")}
        </Link>
      </Button>

      <Card className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <div className="bg-muted rounded-lg p-2">
            <Icon className="size-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {categoryLabel}
              </Badge>
              {!item.is_read && <span className="bg-primary size-2 rounded-full" />}
            </div>
            <h1 className="text-lg font-semibold leading-snug">{item.title}</h1>
          </div>
        </div>

        {item.body ? (
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{item.body}</p>
        ) : null}

        <p className="text-muted-foreground text-xs">
          {new Date(item.created_at).toLocaleString()}
        </p>

        {hasTarget ? (
          <Button asChild>
            <Link href={href}>
              <ExternalLink className="size-4" />
              {tRoot("notifications.bell.viewAll")}
            </Link>
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
