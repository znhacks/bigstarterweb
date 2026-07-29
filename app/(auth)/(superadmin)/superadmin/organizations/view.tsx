"use client";

import React from "react";
import { Trash2, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { RestoreDialog } from "@/components/restore-dialog";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";

import { useAdminOrganizations } from "./logic";
import type { SuperadminOrganization } from "./logic";
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
import { DataGrid, DataGridSearch, DataGridToolbar } from "@/components/data-table/data-grid";

export function SuperadminOrganizationsPage({ data }: { data: SuperadminOrganization[] }) {
  const {
    t,
    table,
    columns,
    selectedRows,
    orgToDelete,
    setOrgToDelete,
    alertMessage,
    setAlertMessage,
    isDeletingId,
    isBulkDeleting,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    handleConfirmDeleteOrg,
    handleBulkDelete,
    restoreOpen,
    setRestoreOpen,
    planOptions,
    statusOptions,
    onRestored
  } = useAdminOrganizations(data);

  return (
    <div className="mx-auto w-full space-y-6 px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
            {t("title")}
          </h1>
        </div>
      </div>
      <div className="flex flex-row flex-wrap items-center gap-2">
        <DataGrid table={table} columns={columns} noResultsText={t("table.noData")}>
          <DataGridToolbar>
            <DataGridSearch columnId="name" placeholder={t("table.search")} />
          </DataGridToolbar>
        </DataGrid>

        <DataTableFacetedFilter
          column={table.getColumn("planName")}
          title="Plan"
          options={planOptions}
        />

        <DataTableFacetedFilter
          column={table.getColumn("planStatus")}
          title="Status"
          options={statusOptions}
        />

        {selectedRows.length > 0 && (
          <Button
            variant="destructive"
            className="h-9 text-xs"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={isBulkDeleting}>
            {isBulkDeleting ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="me-2 h-4 w-4" />
            )}
            Hapus {selectedRows.length} terpilih
          </Button>
        )}

        <Button variant="outline" className="h-9 text-xs" onClick={() => setRestoreOpen(true)}>
          <Trash2 className="me-2 h-4 w-4" />
          <span className="hidden sm:inline">{t("buttons.trash")}</span>
        </Button>

        <DataTableViewOptions table={table} className="md:ms-auto" />
      </div>

      {alertMessage && (
        <Alert
          variant={alertMessage.variant === "destructive" ? "destructive" : "default"}
          className="border-border/80 relative flex items-start gap-3 rounded-xl border pe-10">
          {alertMessage.variant === "destructive" ? (
            <AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <div className="space-y-1">
            <AlertTitle className="font-semibold">{alertMessage.title}</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {alertMessage.description}
            </AlertDescription>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-muted-foreground hover:text-foreground absolute end-4 top-4 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      <DataTable table={table} columns={columns} noResultsText={t("placeholders.noOrgs")} />

      <DataTablePagination table={table} />

      <ConfirmDeleteDialog
        open={!!orgToDelete}
        onOpenChange={(open) => !open && setOrgToDelete(null)}
        confirmName={orgToDelete?.name || ""}
        title={t("dialogDelete.title")}
        description={t("dialogDelete.desc", { orgName: orgToDelete?.name ?? "" })}
        actionLabel={t("buttons.delete")}
        loading={isDeletingId !== null}
        onConfirm={handleConfirmDeleteOrg}
      />

      {/* AlertDialog Shadcn UI untuk Bulk Delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedRows.length} organisasi terpilih?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan melakukan soft-delete pada organisasi yang dipilih. Anda dapat
              memulihkan kembali data ini melalui menu Trash sewaktu-waktu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center gap-2">
              {isBulkDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RestoreDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        kind="tenant"
        onRestored={onRestored}
      />
    </div>
  );
}
