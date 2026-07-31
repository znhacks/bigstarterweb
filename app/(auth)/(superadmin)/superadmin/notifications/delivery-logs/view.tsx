"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  DataGrid,
  DataGridPagination,
  DataGridTable,
  DataGridToolbar,
  DataGridViewOptions,
  useDataTable,
  textCol,
  DataTableFacetedFilter
} from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { SuperadminDeliveryLog } from "../types";

const STATUS_TONE: Record<string, string> = {
  sent: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  failed: "bg-destructive/15 text-destructive",
  skipped: "bg-muted text-muted-foreground"
};

export function DeliveryLogsView({ logs }: { logs: SuperadminDeliveryLog[] }) {
  const t = useTranslations("superadmin.notifications.delivery-logs");
  const tNotif = useTranslations("notifications");

  const channelLabel = (c: string) => {
    try {
      return tNotif(`channel.${c}`);
    } catch {
      return c;
    }
  };
  const statusLabel = (s: string) => {
    try {
      return tNotif(`status_${s}`);
    } catch {
      return s;
    }
  };

  const columns = [
    textCol<SuperadminDeliveryLog>({
      key: "createdAt",
      header: t("colTime"),
      cell: (row) => (
        <div className="text-end tabular-nums">
          {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
        </div>
      )
    }),
    textCol<SuperadminDeliveryLog>({
      key: "title",
      header: t("colTitle"),
      cell: (row) => <span className="line-clamp-1">{row.title ?? "—"}</span>
    }),
    textCol<SuperadminDeliveryLog>({
      key: "userEmail",
      header: t("colRecipient"),
      cell: (row) => (
        <span className="text-muted-foreground">{row.userEmail ?? row.userId.slice(0, 8)}</span>
      )
    }),
    textCol<SuperadminDeliveryLog>({
      key: "channel",
      header: t("colChannel"),
      cell: (row) => <Badge variant="outline">{channelLabel(row.channel)}</Badge>
    }),
    textCol<SuperadminDeliveryLog>({
      key: "status",
      header: t("colStatus"),
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span
            className={`inline-flex w-fit rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[row.status] ?? ""}`}>
            {statusLabel(row.status)}
          </span>
          {row.error ? (
            <span className="text-destructive line-clamp-1 text-[10px]">{row.error}</span>
          ) : null}
        </div>
      )
    }),
    textCol<SuperadminDeliveryLog>({
      key: "source",
      header: t("colSource"),
      cell: (row) => (
        <Badge variant="secondary" className="text-[10px]">
          {row.source}
        </Badge>
      )
    })
  ];

  const table = useDataTable({ columns, data: logs, initialPageSize: 25 });

  return (
    <div className="mx-auto w-full space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <DataGrid table={table} columns={columns}>
        <div className="space-y-3">
          <DataGridToolbar>
            <DataTableFacetedFilter
              column={table.getColumn("channel")}
              title={t("colChannel")}
              options={[
                { value: "in_app", label: channelLabel("in_app") },
                { value: "email", label: channelLabel("email") },
                { value: "push", label: channelLabel("push") }
              ]}
            />
            <DataTableFacetedFilter
              column={table.getColumn("status")}
              title={t("colStatus")}
              options={[
                { value: "sent", label: statusLabel("sent") },
                { value: "delivered", label: statusLabel("delivered") },
                { value: "failed", label: statusLabel("failed") },
                { value: "skipped", label: statusLabel("skipped") }
              ]}
            />
            <DataGridViewOptions />
          </DataGridToolbar>
          <DataGridTable noResultsText={t("empty")} />
          <DataGridPagination />
        </div>
      </DataGrid>
    </div>
  );
}
