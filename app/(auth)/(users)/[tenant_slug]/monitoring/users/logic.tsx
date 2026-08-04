"use client";

import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useDataGrid, textCol, dateCol } from "@/components/data-table";
import { type SchoolUserItem } from "./actions";

export function useSchoolUsersLogic(data: SchoolUserItem[]) {
  const columns = useMemo<ColumnDef<SchoolUserItem>[]>(
    () => [
      textCol<SchoolUserItem>({
        key: "full_name",
        header: "Nama Pengguna / Guru",
        cell: (row) => (
          <div>
            <p className="text-foreground font-semibold text-xs">{row.full_name}</p>
            <p className="text-muted-foreground font-mono text-[11px]">{row.email || "-"}</p>
          </div>
        )
      }),
      textCol<SchoolUserItem>({
        key: "nip",
        header: "NIP / NUPTK",
        cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.nip || "-"}</span>
      }),
      textCol<SchoolUserItem>({
        key: "subject",
        header: "Mata Pelajaran",
        cell: (row) => (
          <Badge variant="outline" className="font-normal text-xs bg-accent/30">
            {row.subject || "-"}
          </Badge>
        )
      }),
      textCol<SchoolUserItem>({
        key: "role",
        header: "Peran / Jabatan",
        cell: (row) => (
          <Badge variant="secondary" className="font-medium text-[11px]">
            {row.role}
          </Badge>
        )
      }),
      textCol<SchoolUserItem>({
        key: "status",
        header: "Status",
        cell: (row) => (
          <Badge
            className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold ${
              row.status === "aktif"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-muted text-muted-foreground border-border"
            }`}>
            {row.status}
          </Badge>
        )
      }),
      dateCol<SchoolUserItem>({
        key: "last_active_at",
        header: "Terakhir Aktif"
      })
    ],
    []
  );

  const table = useDataGrid({ columns, data });

  return { table, columns };
}
