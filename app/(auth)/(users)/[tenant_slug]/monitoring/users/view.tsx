"use client";

import * as React from "react";
import Link from "next/link";
import { Users, UserCheck, BookOpen, AlertCircle, Link as LinkIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataGrid, DataGridTable } from "@/components/data-table";
import { type SchoolUserItem } from "./actions";
import { useSchoolUsersLogic } from "./logic";

import { SchoolMultiFilter, type SchoolFilterOption } from "@/components/monitoring/school-multi-filter";
import { useParams } from "next/navigation";

interface ViewProps {
  schoolCode: string | null;
  tenantName: string | null;
  connectedSchools?: SchoolFilterOption[];
  users: SchoolUserItem[];
  stats: {
    totalTeachers: number;
    activeUsers: number;
    totalSubjects: number;
  };
}

export function SchoolUsersView({
  schoolCode,
  tenantName,
  connectedSchools = [],
  users,
  stats
}: ViewProps) {
  const params = useParams();
  const tenantSlug = (params?.tenant_slug as string) || "";
  const [selectedSchoolIds, setSelectedSchoolIds] = React.useState<string[]>([]);

  const filteredUsers = React.useMemo(() => {
    if (selectedSchoolIds.length === 0) return users;
    return users.filter((u) =>
      selectedSchoolIds.some(
        (id) =>
          u.school_code.toLowerCase().includes(id.toLowerCase()) ||
          connectedSchools.some(
            (s) =>
              s.id === id &&
              (u.school_code.toLowerCase().includes(s.name.toLowerCase()) ||
                u.school_code.toLowerCase().includes(s.code.toLowerCase()))
          )
      )
    );
  }, [users, selectedSchoolIds, connectedSchools]);

  const { table, columns } = useSchoolUsersLogic(filteredUsers);

  if (!schoolCode) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Kode Sekolah Belum Dihubungkan</h2>
        <p className="text-muted-foreground text-sm max-w-md mt-2 mb-6">
          Hubungkan Kode Sekolah dari basis data Jurnal Mengajar pada Pengaturan Organisasi untuk mengaktifkan pemantauan daftar pengguna dan guru.
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
          <h1 className="text-2xl font-bold tracking-tight">Pemantauan Pengguna & Guru Sekolah</h1>
          <p className="text-muted-foreground text-xs mt-1">
            Daftar guru, pengurus, NIP, mata pelajaran, dan status keaktifan pengguna yang terdaftar di sekolah {tenantName || ""}.
          </p>
        </div>
        <SchoolMultiFilter
          schools={connectedSchools}
          selectedIds={selectedSchoolIds}
          onChange={setSelectedSchoolIds}
        />
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Pengguna Terdaftar</p>
            <p className="text-2xl font-bold">{stats.totalTeachers}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pengguna Aktif</p>
            <p className="text-2xl font-bold">{stats.activeUsers}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Mata Pelajaran</p>
            <p className="text-2xl font-bold">{stats.totalSubjects}</p>
          </div>
        </Card>
      </div>

      <DataGrid table={table} columns={columns}>
        <DataGridTable noResultsText="Belum ada data pengguna / guru yang terdaftar untuk Kode Sekolah ini." />
      </DataGrid>
    </div>
  );
}
