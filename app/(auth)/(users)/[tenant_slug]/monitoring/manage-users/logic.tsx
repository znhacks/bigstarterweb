"use client";

import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDataGrid, textCol, dateCol, actionCol } from "@/components/data-table";
import { Pencil, Trash2 } from "lucide-react";
import {
  type ManageUserItem,
  type ConnectedSchoolOption,
  createJurnalUserAction,
  updateJurnalUserAction,
  deleteJurnalUserAction
} from "./actions";

export function useManageUsersLogic(
  tenantSlug: string,
  initialUsers: ManageUserItem[],
  connectedSchools: ConnectedSchoolOption[]
) {
  const [users, setUsers] = useState<ManageUserItem[]>(initialUsers);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManageUserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManageUserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<ManageUserItem>[]>(
    () => [
      textCol<ManageUserItem>({
        key: "full_name",
        header: "Nama Pengguna",
        cell: (row) => (
          <div>
            <p className="text-foreground font-semibold text-xs">{row.full_name}</p>
            <p className="text-muted-foreground font-mono text-[11px]">{row.email || "-"}</p>
          </div>
        )
      }),
      textCol<ManageUserItem>({
        key: "phone",
        header: "NIP / Nomor HP",
        cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.phone || "-"}</span>
      }),
      textCol<ManageUserItem>({
        key: "position",
        header: "Mata Pelajaran / Jabatan",
        cell: (row) => (
          <Badge variant="outline" className="font-normal text-xs bg-accent/30">
            {row.position || "Umum"}
          </Badge>
        )
      }),
      textCol<ManageUserItem>({
        key: "role",
        header: "Peran (Role)",
        cell: (row) => {
          const r = row.role?.toLowerCase() || "";
          const isPending = r === "pending_guru";
          const isAdmin = r === "admin";
          const isGuru = r === "guru";

          return (
            <Badge
              className={`font-semibold text-[11px] ${
                isAdmin
                  ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                  : isGuru
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : isPending
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}>
              {isAdmin
                ? "Admin Sekolah"
                : isGuru
                ? "Guru Pengajar"
                : isPending
                ? "Pending Guru"
                : row.role}
            </Badge>
          );
        }
      }),
      textCol<ManageUserItem>({
        key: "school_name",
        header: "Sekolah",
        cell: (row) => (
          <Badge variant="secondary" className="font-medium text-[11px]">
            {row.school_name}
          </Badge>
        )
      }),
      dateCol<ManageUserItem>({
        key: "created_at",
        header: "Waktu Dibuat",
        includeTime: true
      }),
      actionCol<ManageUserItem>({
        header: "Aksi",
        cell: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setEditingUser(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              onClick={() => setDeletingUser(row)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })
    ],
    []
  );

  const table = useDataGrid({ columns, data: users });

  const handleCreateUser = async (formData: {
    fullName: string;
    email?: string;
    phone?: string;
    role: string;
    position?: string;
    schoolId: string;
  }) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    const res = await createJurnalUserAction(tenantSlug, formData);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
      return false;
    }

    const schoolObj = connectedSchools.find((s) => s.id === formData.schoolId);
    const newUserItem: ManageUserItem = {
      id: "temp-" + Date.now(),
      school_id: formData.schoolId,
      school_name: schoolObj?.name || "Sekolah",
      school_code: schoolObj?.code || "",
      full_name: formData.fullName,
      email: formData.email || null,
      phone: formData.phone || null,
      role: formData.role,
      position: formData.position || null,
      created_at: new Date().toISOString()
    };

    setUsers((prev) => [newUserItem, ...prev]);
    setIsAddOpen(false);
    return true;
  };

  const handleUpdateUser = async (formData: {
    fullName: string;
    email?: string;
    phone?: string;
    role: string;
    position?: string;
    schoolId?: string;
  }) => {
    if (!editingUser) return false;
    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await updateJurnalUserAction(tenantSlug, editingUser.id, formData);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
      return false;
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === editingUser.id) {
          const sObj = connectedSchools.find((s) => s.id === (formData.schoolId || u.school_id));
          return {
            ...u,
            full_name: formData.fullName,
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.role,
            position: formData.position || null,
            school_id: formData.schoolId || u.school_id,
            school_name: sObj?.name || u.school_name
          };
        }
        return u;
      })
    );

    setEditingUser(null);
    return true;
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);

    const res = await deleteJurnalUserAction(tenantSlug, deletingUser.id);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
    setDeletingUser(null);
  };

  return {
    table,
    columns,
    users,
    isAddOpen,
    setIsAddOpen,
    editingUser,
    setEditingUser,
    deletingUser,
    setDeletingUser,
    isSubmitting,
    errorMsg,
    setErrorMsg,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser
  };
}
