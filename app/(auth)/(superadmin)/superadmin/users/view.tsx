"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Loader2, Trash2 } from "lucide-react";

import {
  useDataTable,
  DataTable,
  DataTableSearch,
  DataTableViewOptions,
  DataTablePagination,
  DataTableColumnHeader,
  createSelectColumn,
  multiSelectFilterFn,
  DataGrid,
  DataGridToolbar,
  DataGridSearch,
  DataGridTable,
  DataGridPagination,
  DataGridViewOptions,
  DataTableFacetedFilter
} from "@/components/data-table";

import { Button } from "@/components/ui/button";

import { BAN_DURATIONS, DEFAULT_BAN_KEY, computeBannedUntil } from "@/config/moderation";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { RestoreDialog } from "@/components/restore-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User, useUsersLogic } from "./logic";

interface UsersDataTableProps {
  data?: User[];
}

export default function UsersDataTable({ data }: UsersDataTableProps) {
  const {
    isLoading,
    t,
    table,
    statuses,
    plansList,
    roles,
    setRestoreOpen,
    columns,
    userToDelete,
    setUserToDelete,
    ttable,
    deleteSaving,
    confirmDeleteUser,
    userToBan,
    setUserToBan,
    tMod,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    banSaving,
    confirmBan,
    restoreOpen,
    loadUsersFromSupabase
  } = useUsersLogic({ data });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <DataGrid table={table} columns={columns}>
        <DataGridToolbar>
          <DataGridSearch columnId="name" placeholder={t("filters.search")} />

          {/* Menggunakan DataGridFacetedFilter dengan ID kolom bertipe string */}
          {/* <DataTableFacetedFilter
            column="status"
            title={t("filters.status")}
            options={statuses}
            emptyText={t("filters.noStatus")}
          />

          <DataTableFacetedFilter
            column="plan_name"
            title={t("filters.plan")}
            options={plansList}
            emptyText={t("filters.noPlan")}
          />

          <DataTableFacetedFilter
            column="role"
            title={t("filters.role")}
            options={roles}
            emptyText={t("filters.noRole")}
          /> */}

          <Button variant="outline" className="h-9 text-xs" onClick={() => setRestoreOpen(true)}>
            <Trash2 className="me-2 h-4 w-4" />
            <span className="hidden md:inline">{t("trash")}</span>
          </Button>
          <DataGridViewOptions label={t("filters.columns")} />
        </DataGridToolbar>
        <DataGridTable />
        <DataGridPagination
          pageSizeOptions={[10, 20, 50, 100]}
          rowsPerPageLabel={t("table.rowsPerPage")}
          selectedLabel={(selected, total) => `${selected} / ${total} ${t("selected")}`}
        />
      </DataGrid>

      <ConfirmDeleteDialog
        open={!!userToDelete}
        onOpenChange={(o) => !o && setUserToDelete(null)}
        confirmName={userToDelete?.name || ""}
        loading={deleteSaving}
        onConfirm={confirmDeleteUser}
      />

      <Sheet open={!!userToBan} onOpenChange={(o) => !o && setUserToBan(null)}>
        <SheetContent side="right" className="flex h-full flex-col p-6 sm:max-w-[440px]">
          <SheetHeader className="text-start">
            <SheetTitle>{tMod("ban.title", { name: userToBan?.name || "" })}</SheetTitle>
            <SheetDescription>
              {tMod("ban.description") ||
                "Silakan tentukan durasi dan alasan pemblokiran pengguna."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>{tMod("ban.duration")}</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BAN_DURATIONS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {tMod(d.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{tMod("ban.reason")}</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={4}
                placeholder={tMod("ban.reasonPlaceholder")}
                className="resize-none"
              />
            </div>
          </div>

          <SheetFooter className="flex flex-row items-center justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setUserToBan(null)} disabled={banSaving}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={confirmBan} disabled={banSaving} variant="destructive">
              {banSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {tMod("ban.confirm")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <RestoreDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        kind="user"
        onRestored={loadUsersFromSupabase}
      />
    </div>
  );
}
