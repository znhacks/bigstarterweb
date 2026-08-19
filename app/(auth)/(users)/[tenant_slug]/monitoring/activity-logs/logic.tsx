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
        header: "Tipe Event",
        cell: (row) => (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">{row.activity_type}</span>
            <Badge
              className={`w-fit font-bold text-[9px] uppercase ${row.event_type === "LOGIN"
                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                  : row.event_type === "REGISTER"
                    ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                    : row.event_type === "LOGOUT"
                      ? "bg-gray-500/10 text-gray-600 border-gray-500/20"
                      : row.event_type === "SUSPICIOUS_ATTEMPT"
                        ? "bg-red-500/20 text-red-600 border-red-500/30"
                        : "bg-secondary text-secondary-foreground"
                }`}
            >
              {row.event_type}
            </Badge>
          </div>
        )
      }),
      textCol<ActivityLogItem>({
        key: "device_info",
        header: "Perangkat / App",
        cell: (row) => (
          <span className="text-muted-foreground text-xs max-w-[200px] truncate block" title={row.device_info}>
            {row.device_info || "-"}
          </span>
        )
      }),
      textCol<ActivityLogItem>({
        key: "ip_address",
        header: "IP & Lokasi",
        cell: (row) => (
          <div>
            <p className="font-mono text-xs font-semibold">{row.ip_address}</p>
            <p className="text-[10px] text-muted-foreground">{row.location || "Indonesia"}</p>
          </div>
        )
      }),
      textCol<ActivityLogItem>({
        key: "status",
        header: "Status Keamanan",
        cell: (row) => (
          row.is_suspicious ? (
            <div className="flex flex-col">
              <Badge variant="destructive" className="w-fit text-[10px] font-bold gap-1">
                ⚠️  RISK
              </Badge>
              {row.suspicious_reason && (
                <span className="text-[9px] text-destructive mt-0.5 max-w-[150px] leading-tight">
                  {row.suspicious_reason}
                </span>
              )}
            </div>
          ) : (
            <Badge
              className="rounded-full px-2 py-0.5 text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            >
              ✓ SAFE
            </Badge>
          )
        )
      }),
      dateCol<ActivityLogItem>({
        key: "created_at",
        header: "Waktu Aktivitas",
        includeTime: true
      })
    ],
    []
  );

  const table = useDataGrid({ columns, data });

  return { table, columns };
}
