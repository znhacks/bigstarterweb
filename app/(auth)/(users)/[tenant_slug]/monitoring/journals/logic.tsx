"use client";

import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useDataGrid, textCol, dateCol } from "@/components/data-table";
import { type JournalLogItem } from "./actions";

export function useJournalLogsLogic(data: JournalLogItem[]) {
  const columns = useMemo<ColumnDef<JournalLogItem>[]>(
    () => [
      textCol<JournalLogItem>({
        key: "class_name",
        header: "Kelas & Waktu",
        cell: (row) => (
          <div>
            <Badge variant="outline" className="font-bold text-xs bg-primary/5 text-primary border-primary/20">
              {row.class_name}
            </Badge>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              {row.start_time} - {row.end_time}
            </p>
          </div>
        )
      }),
      textCol<JournalLogItem>({
        key: "teacher_name",
        header: "Guru & Mapel",
        cell: (row) => (
          <div>
            <p className="text-foreground font-semibold text-xs">{row.teacher_name}</p>
            <p className="text-muted-foreground text-[11px]">{row.subject}</p>
          </div>
        )
      }),
      textCol<JournalLogItem>({
        key: "topic",
        header: "Topik Pembelajaran",
        cell: (row) => (
          <p className="text-foreground text-xs font-medium max-w-sm line-clamp-2" title={row.topic}>
            {row.topic}
          </p>
        )
      }),
      textCol<JournalLogItem>({
        key: "attendance_summary",
        header: "Ringkasan Kehadiran",
        cell: (row) => (
          <span className="font-mono text-xs text-muted-foreground">{row.attendance_summary}</span>
        )
      }),
      textCol<JournalLogItem>({
        key: "status",
        header: "Status Jurnal",
        cell: (row) => (
          <Badge
            className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold ${
              row.status === "terverifikasi"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : row.status === "pending"
                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                : "bg-muted text-muted-foreground border-border"
            }`}>
            {row.status}
          </Badge>
        )
      }),
      dateCol<JournalLogItem>({
        key: "teaching_date",
        header: "Tanggal Mengajar"
      })
    ],
    []
  );

  const table = useDataGrid({ columns, data });

  return { table, columns };
}
