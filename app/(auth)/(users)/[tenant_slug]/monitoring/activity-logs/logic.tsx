"use client";

import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useDataGrid, textCol, dateCol } from "@/components/data-table";
import { type ActivityLogItem } from "./actions";

export function useActivityLogsLogic(data: ActivityLogItem[]) {
  const columns = useMemo<ColumnDef<ActivityLogItem>[]>(
    () => [
      textCol<ActivityLogItem>({
        key: "user_name",
        header: "Pengguna / Guru",
        cell: (row) => (
          <div>
            <p className="text-foreground font-semibold text-xs">{row.user_name}</p>
            <p className="text-muted-foreground text-[11px]">{row.user_role}</p>
          </div>
        )
      }),
      textCol<ActivityLogItem>({
        key: "activity_type",
        header: "Tipe Aktivitas",
        cell: (row) => (
          <Badge variant="secondary" className="font-medium text-[11px]">
            {row.activity_type}
          </Badge>
        )
      }),
      textCol<ActivityLogItem>({
        key: "device_info",
        header: "Perangkat / App",
        cell: (row) => <span className="text-muted-foreground text-xs">{row.device_info || "-"}</span>
      }),
      textCol<ActivityLogItem>({
        key: "ip_address",
        header: "IP Address",
        cell: (row) => <span className="font-mono text-xs text-muted-foreground/80">{row.ip_address}</span>
      }),
      textCol<ActivityLogItem>({
        key: "status",
        header: "Status",
        cell: (row) => (
          <Badge
            className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-bold ${
              row.status === "success"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : row.status === "warning"
                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}>
            {row.status}
          </Badge>
        )
      }),
      dateCol<ActivityLogItem>({
        key: "created_at",
        header: "Waktu Aktivitas"
      })
    ],
    []
  );

  const table = useDataGrid({ columns, data });

  return { table, columns };
}
