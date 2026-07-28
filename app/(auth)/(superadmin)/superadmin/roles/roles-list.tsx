"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Loader2, Plus, ChevronDown, ChevronUp, X, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PERMISSION_GROUPS } from "@/lib/rbac";

import {
  deleteRole,
  updateRole,
  createRole,
  setRolePermissions,
  getRolePermissions
} from "./actions";

import { useDataTable } from "@/components/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { numCol, actionCol, textCol } from "@/components/data-table/columns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface RoleRow {
  id: string;
  name: string;
  hierarchy_level: number;
  members_count: number;
  permissions_count: number;
}

interface Permission {
  id: string;
  name: string;
  description: string | null;
}

interface RolesListProps {
  rows: RoleRow[];
  permissions?: Permission[];
}

export function RolesList({ rows: initialRows, permissions = [] }: RolesListProps) {
  const t = useTranslations("superadmin.roles");
  const locale = useLocale();
  const router = useRouter();

  const [rows, setRows] = React.useState(initialRows);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [panelOpen, setPanelOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<RoleRow | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loadingPerms, setLoadingPerms] = React.useState(false);

  const [formName, setFormName] = React.useState("");
  const [formHierarchy, setFormHierarchy] = React.useState(0);
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
    setFormHierarchy(0);
    setSelectedPerms(new Set());
    setError(null);
    setOpenSections({ general: true, permissions: false });
    setPanelOpen(true);
  };

  const handleOpenEdit = async (role: RoleRow) => {
    setSelectedRole(role);
    setFormName(role.name);
    setFormHierarchy(role.hierarchy_level);
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
        console.error("Gagal memuat hak akses:", err);
      } finally {
        setLoadingPerms(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.set("name", formName);
      fd.set("hierarchy_level", String(formHierarchy));

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
                  hierarchy_level: formHierarchy,
                  permissions_count: selectedPerms.size
                }
              : r
          )
        );
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data.");
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
    }
  };

  const columns: ColumnDef<RoleRow>[] = [
    textCol<RoleRow>({
      key: "name",
      header: t("list.name"),
      cell: (row) => <span className="text-foreground font-semibold">{row.name}</span>
    }),
    textCol<RoleRow>({
      key: "hierarchy_level",
      header: t("list.hierarchy"),
      cell: (row) => <Badge variant="secondary">h{row.hierarchy_level}</Badge>
    }),
    numCol<RoleRow>({
      key: "members_count",
      header: t("list.members")
    }),
    numCol<RoleRow>({
      key: "permissions_count",
      header: t("list.permissions")
    }),
    actionCol<RoleRow>({
      header: t("list.actions"),
      enableSorting: false,
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleOpenEdit(row)}
            title={t("detail.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDeleteTargetId(row.id)}
            disabled={pendingId === row.id}
            title={t("messages.delete")}>
            {pendingId === row.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="text-destructive h-4 w-4" />
            )}
          </Button>
        </div>
      )
    })
  ];

  const table = useDataTable({ columns, data: rows });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("desc")}</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="me-1.5 h-4 w-4" /> {t("new.title") || "Tambah Peran"}
        </Button>
      </div>

      {error && (
        <p className="text-destructive border-destructive/30 bg-destructive/10 animate-in fade-in rounded-lg border px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <DataTable table={table} columns={columns} noResultsText={t("list.empty")} />

      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("messages.confirmDeleteTitle") || "Hapus Peran"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("messages.confirmDelete") ||
                "Apakah Anda yakin ingin menghapus peran ini? Tindakan ini tidak dapat dibatalkan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("messages.cancel") || "Batal"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("messages.delete") || "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {panelOpen && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 min-h-full bg-black/40 transition-opacity duration-300"
          onClick={() => setPanelOpen(false)}
        />
      )}

      <div
        className={`border-border bg-background fixed inset-y-0 z-50 flex h-full w-full flex-col shadow-2xl transition-[transform,opacity] duration-300 ease-in-out sm:max-w-lg md:max-w-xl ${
          isRtl ? "left-0 border-r" : "right-0 border-l"
        } ${
          panelOpen
            ? "pointer-events-auto translate-x-0 opacity-100"
            : isRtl
              ? "pointer-events-none -translate-x-full opacity-0"
              : "pointer-events-none translate-x-full opacity-0"
        }`}>
        <div className="border-border flex items-center justify-between border-b p-6">
          <div className="space-y-1.5">
            <h2 className="text-foreground text-xl font-bold">
              {selectedRole ? t("detail.editTitle") : t("new.title") || "Tambah Peran"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {selectedRole
                ? "Ubah properti dan izin peran di bawah ini"
                : "Konfigurasikan peran sistem baru"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setPanelOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSave} className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="animate-in fade-in overflow-hidden">
            <Button
              type="button"
              onClick={() => toggleSection("general")}
              className="bg-dropdown/50 hover:bg-dropdown flex w-full items-center justify-between border text-left transition-colors">
              <span className="text-foreground text-sm font-semibold">General</span>
              {openSections.general ? (
                <ChevronUp className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              )}
            </Button>

            {openSections.general && (
              <div className="space-y-4 p-5">
                <div className="space-y-2">
                  <Label htmlFor="panel-name">{t("new.nameLabel")}</Label>
                  <Input
                    id="panel-name"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Administrator"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panel-hierarchy">{t("new.hierarchyLabel")}</Label>
                  <Input
                    id="panel-hierarchy"
                    type="number"
                    min={0}
                    value={formHierarchy}
                    onChange={(e) => setFormHierarchy(Number(e.target.value) || 0)}
                  />
                  <p className="text-muted-foreground text-xs">{t("new.hierarchyHint")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="animate-in fade-in overflow-hidden">
            <Button
              type="button"
              onClick={() => toggleSection("permissions")}
              className="bg-dropdown/50 hover:bg-dropdown flex w-full items-center justify-between border text-left transition-colors">
              <span className="text-foreground text-sm font-semibold">Konfigurasi Hak Akses</span>
              {openSections.permissions ? (
                <ChevronUp className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              )}
            </Button>

            {openSections.permissions && (
              <div className="space-y-6 p-5">
                {loadingPerms ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  PERMISSION_GROUPS.map((group) => {
                    const groupPerms = (permissions || []).filter((p) =>
                      group.names.includes(p.name as any)
                    );
                    const allSelected = groupPerms.every((p) => selectedPerms.has(p.id));
                    const someSelected =
                      groupPerms.some((p) => selectedPerms.has(p.id)) && !allSelected;
                    if (groupPerms.length === 0) return null;
                    return (
                      <div key={group.domain} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-foreground text-sm font-semibold">{group.label}</h4>
                          <Checkbox
                            checked={allSelected ? true : someSelected ? "indeterminate" : false}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedPerms);

                              if (checked) {
                                groupPerms.forEach((p) => next.add(p.id));
                              } else {
                                groupPerms.forEach((p) => next.delete(p.id));
                              }

                              setSelectedPerms(next);
                            }}
                          />
                        </div>

                        <div className="grid gap-1">
                          {groupPerms.map((p) => (
                            <label
                              key={p.id}
                              htmlFor={`perm-${p.id}`}
                              className="hover:bg-accent/40 flex cursor-pointer items-center justify-between rounded-lg py-1 pl-2 transition-colors">
                              <div className="flex items-center gap-1.5">
                                <span className="text-foreground text-sm font-medium">
                                  {p.name}
                                </span>

                                {p.description && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground"
                                        onClick={(e) => e.preventDefault()}>
                                        <CircleHelp className="h-4 w-4" />
                                      </button>
                                    </TooltipTrigger>

                                    <TooltipContent side="top">
                                      <p>{p.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <Checkbox
                                id={`perm-${p.id}`}
                                checked={selectedPerms.has(p.id)}
                                onCheckedChange={() => togglePermission(p.id)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="border-border bg-background/90 absolute right-0 bottom-0 left-0 z-10 flex items-center justify-end gap-3 border-t p-6 backdrop-blur-sm">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPanelOpen(false)}
              disabled={saving}>
              {t("messages.back") || "Kembali"}
            </Button>
            <Button type="submit" disabled={saving || loadingPerms}>
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("detail.save") || "Simpan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
