"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Loader2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDataGrid, numCol, actionCol, textCol } from "@/components/data-table";

import {
  deleteRole,
  updateRole,
  createRole,
  setRolePermissions,
  getRolePermissions
} from "./actions";
import { formatNumber } from "@/lib/i18n/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export interface RoleRow {
  id: string;
  name: string;
  members_count: number;
  permissions_count: number;
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
}

export function useAdminRoles(initialRows: RoleRow[], permissions: Permission[] = []) {
  const t = useTranslations("superadmin.roles");
  const locale = useLocale();
  const router = useRouter();

  const [rows, setRows] = React.useState<RoleRow[]>(initialRows);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [panelOpen, setPanelOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<RoleRow | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loadingPerms, setLoadingPerms] = React.useState(false);

  const [formName, setFormName] = React.useState("");
  const [selectedPerms, setSelectedPerms] = React.useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  const [isMounted, setIsMounted] = React.useState(false);
  const isRtl = locale === "ar";

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    general: true,
    permissions: false
  });

  React.useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const togglePermission = (id: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenCreate = () => {
    setSelectedRole(null);
    setFormName("");
    setSelectedPerms(new Set());
    setError(null);
    setOpenSections({ general: true, permissions: false });
    setPanelOpen(true);
  };

  const handleOpenEdit = React.useCallback(async (role: RoleRow) => {
    setSelectedRole(role);
    setFormName(role.name);
    setSelectedPerms(new Set());
    setError(null);
    setOpenSections({ general: true, permissions: false });
    setPanelOpen(true);

    if (getRolePermissions) {
      setLoadingPerms(true);
      try {
        const res = await getRolePermissions(role.id);
        if (res.success && res.grantedIds) {
          setSelectedPerms(new Set(res.grantedIds));
        }
      } catch (err) {
        console.error("Failed to load accessibilities", err);
      } finally {
        setLoadingPerms(false);
      }
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.set("name", formName);

      let roleId = selectedRole?.id;

      if (selectedRole) {
        fd.set("id", selectedRole.id);
        const res = await updateRole(fd);
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await createRole(fd);
        if (!res.success) throw new Error(res.error);
        roleId = res.roleId;
      }

      if (roleId) {
        const permsRes = await setRolePermissions(roleId, Array.from(selectedPerms));
        if (!permsRes.success) throw new Error(permsRes.error);
      }

      setPanelOpen(false);
      router.refresh();

      if (selectedRole) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === selectedRole.id
              ? {
                  ...r,
                  name: formName,
                  permissions_count: selectedPerms.size
                }
              : r
          )
        );
      } else {
        setFormName("");
        setSelectedPerms(new Set());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    const idToDelete = deleteTargetId;
    setDeleteTargetId(null);

    setPendingId(idToDelete);
    setError(null);

    const fd = new FormData();
    fd.set("id", idToDelete);
    const res = await deleteRole(fd);
    setPendingId(null);

    if (!res.success) {
      setError(res.error);
    } else {
      setRows((prev) => prev.filter((r) => r.id !== idToDelete));
      router.refresh();
    }
  };

  const columns = React.useMemo<ColumnDef<RoleRow>[]>(
    () => [
      textCol<RoleRow>({
        key: "name",
        header: t("list.name"),
        cell: (row) => <span className="text-foreground font-semibold">{row.name}</span>
      }),
      numCol<RoleRow>({
        key: "members_count",
        header: t("list.members"),
        format: (v) => formatNumber(v, locale)
      }),
      numCol<RoleRow>({
        key: "permissions_count",
        header: t("list.permissions"),
        format: (v) => formatNumber(v, locale)
      }),
      actionCol<RoleRow>({
        header: t("list.actions"),
        enableSorting: false,
        cell: (row) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only"></span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => handleOpenEdit(row)}
                  className="text-amber-600 focus:text-amber-600 dark:text-amber-500">
                  <Pencil className="me-2 h-4 w-4" /> {t("buttons.edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteTargetId(row.id)}
                  className="text-destructive focus:text-destructive"
                  disabled={pendingId === row.id}>
                  <Trash2 className="text-destructive h-4 w-4" /> {t("buttons.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      })
    ],
    [t, pendingId, handleOpenEdit]
  );

  const table = useDataGrid({ columns, data: rows });

  return {
    t,
    locale,
    isRtl,
    isMounted,
    table,
    columns,
    rows,
    pendingId,
    error,
    setError,
    panelOpen,
    setPanelOpen,
    selectedRole,
    saving,
    loadingPerms,
    formName,
    setFormName,
    selectedPerms,
    setSelectedPerms,
    deleteTargetId,
    setDeleteTargetId,
    openSections,
    toggleSection,
    togglePermission,
    handleOpenCreate,
    handleOpenEdit,
    handleSave,
    confirmDelete
  };
}
