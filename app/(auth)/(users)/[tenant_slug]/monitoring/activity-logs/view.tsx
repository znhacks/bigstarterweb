"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Smartphone, CheckCircle, AlertCircle, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataGrid, DataGridTable } from "@/components/data-table";
import { type ActivityLogItem } from "./actions";
import { useActivityLogsLogic } from "./logic";

interface ViewProps {
  schoolCode: string | null;
  tenantName: string | null;
  logs: ActivityLogItem[];
  stats: {
    totalToday: number;
    activeDevices: number;
    successRate: number;
  };
}

export function ActivityLogsView({ schoolCode, tenantName, logs, stats }: ViewProps) {
  const { table, columns } = useActivityLogsLogic(logs);

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
          <Link href="../organization/general">
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Log Aktivitas Mobile App</h1>
            <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
              Kode Sekolah: {schoolCode}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Pemantauan riwayat aktivitas login, check-in, dan input jurnal guru pada aplikasi mobile sekolah {tenantName || ""}.
          </p>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Aktivitas Hari Ini</p>
            <p className="text-2xl font-bold">{stats.totalToday}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Perangkat Mobile Aktif</p>
            <p className="text-2xl font-bold">{stats.activeDevices}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tingkat Keberhasilan Sesi</p>
            <p className="text-2xl font-bold">{stats.successRate}%</p>
          </div>
        </Card>
      </div>

      <DataGrid table={table} columns={columns}>
        <DataGridTable noResultsText="Belum ada data log aktivitas mobile yang tercatat untuk Kode Sekolah ini." />
      </DataGrid>
    </div>
  );
}
