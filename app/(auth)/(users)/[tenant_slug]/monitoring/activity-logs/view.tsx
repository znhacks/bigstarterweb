"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Smartphone, CheckCircle, AlertCircle, ShieldAlert, Link as LinkIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataGrid, DataGridTable } from "@/components/data-table";
import { type ActivityLogItem } from "./actions";
import { useActivityLogsLogic } from "./logic";

import { SchoolMultiFilter, type SchoolFilterOption } from "@/components/monitoring/school-multi-filter";
import { useParams } from "next/navigation";

interface ViewProps {
  schoolCode: string | null;
  tenantName: string | null;
  connectedSchools?: SchoolFilterOption[];
  logs: ActivityLogItem[];
  stats: {
    totalToday: number;
    activeDevices: number;
    suspiciousCount: number;
    successRate: number;
  };
}

export function ActivityLogsView({
  schoolCode,
  tenantName,
  connectedSchools = [],
  logs,
  stats
}: ViewProps) {
  const params = useParams();
  const tenantSlug = (params?.tenant_slug as string) || "";
  const [selectedSchoolIds, setSelectedSchoolIds] = React.useState<string[]>([]);
  const [eventFilter, setEventFilter] = React.useState<string>("ALL");

  const filteredLogs = React.useMemo(() => {
    return logs.filter((l) => {
      const matchesSchool =
        selectedSchoolIds.length === 0 ||
        selectedSchoolIds.some(
          (id) =>
            l.school_code.toLowerCase().includes(id.toLowerCase()) ||
            connectedSchools.some(
              (s) =>
                s.id === id &&
                (l.school_code.toLowerCase().includes(s.name.toLowerCase()) ||
                  l.school_code.toLowerCase().includes(s.code.toLowerCase()))
            )
        );

      const matchesEvent =
        eventFilter === "ALL" ||
        (eventFilter === "SUSPICIOUS" && l.is_suspicious) ||
        l.event_type === eventFilter;

      return matchesSchool && matchesEvent;
    });
  }, [logs, selectedSchoolIds, connectedSchools, eventFilter]);

  const { table, columns } = useActivityLogsLogic(filteredLogs);

  if (!schoolCode) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Kode Sekolah Belum Dihubungkan</h2>
        <p className="text-muted-foreground text-sm max-w-md mt-2 mb-6">
          Hubungkan Kode Sekolah dari basis data Jurnal Mengajar pada Pengaturan Organisasi untuk mengaktifkan pemantauan aktivitas aplikasi mobile.
        </p>
        <Button asChild>
          <Link href={`/${tenantSlug}/organization/general`}>
            <LinkIcon className="me-2 h-4 w-4" /> Hubungkan Kode Sekolah Sekarang
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Log Keamanan &amp; Aktivitas App
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Pemantauan riwayat login, logout, register, serta deteksi potensi intruder pada aplikasi mobile {tenantName || ""}.
          </p>
        </div>
        <SchoolMultiFilter
          schools={connectedSchools}
          selectedIds={selectedSchoolIds}
          onChange={setSelectedSchoolIds}
        />
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Log Hari Ini</p>
            <p className="text-2xl font-bold">{stats.totalToday}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Perangkat Aktif</p>
            <p className="text-2xl font-bold">{stats.activeDevices}</p>
          </div>
        </Card>

        <Card className={`p-4 flex items-center gap-4 ${stats.suspiciousCount > 0 ? "border-destructive/40 bg-destructive/5" : ""}`}>
          <div className="p-3 bg-destructive/10 rounded-xl text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Deteksi Intruder/Proxy</p>
            <p className="text-2xl font-bold text-destructive">{stats.suspiciousCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Keberhasilan Sesi</p>
            <p className="text-2xl font-bold">{stats.successRate}%</p>
          </div>
        </Card>
      </div>

      {/* Event Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {["ALL", "LOGIN", "REGISTER", "LOGOUT", "SUSPICIOUS"].map((filterKey) => (
          <Button
            key={filterKey}
            size="sm"
            variant={eventFilter === filterKey ? "default" : "outline"}
            onClick={() => setEventFilter(filterKey)}
            className="text-xs font-semibold"
          >
            {filterKey === "ALL" ? "Semua Event" : filterKey === "SUSPICIOUS" ? "⚠️ Intruder/Mencurigakan" : filterKey}
          </Button>
        ))}
      </div>

      <DataGrid table={table} columns={columns}>
        <DataGridTable noResultsText="Belum ada data log aktivitas mobile yang cocok dengan filter." />
      </DataGrid>
    </div>
  );
}
