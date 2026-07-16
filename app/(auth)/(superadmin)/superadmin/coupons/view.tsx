// app/(auth)/(superadmin)/superadmin/coupons/view.tsx
"use client";

import React, { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus, Trash2, ShieldAlert, Check, Ticket, Calendar, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/i18n/format";

import { useDataTable } from "@/components/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { createSelectColumn } from "@/components/data-table/data-table-select-column";
import { multiSelectFilterFn } from "@/components/data-table/data-table-filters";

import { useAdminCoupons, getExpiryStatus, DBCoupon } from "./logic";

const containsFilterFn = (row: any, columnId: string, filterValue: string) => {
  if (!filterValue) return true;
  return String(row.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase());
};

export function AdminCouponsPage() {
  const {
    t,
    locale,
    coupons,
    isLoading,
    isSaving,
    errorMsg,
    successMsg,
    dialogOpen,
    setDialogOpen,
    form,
    setForm,
    deleteTarget,
    setDeleteTarget,
    bulkConfirmOpen,
    setBulkConfirmOpen,
    isBulkDeleting,
    formatDiscount,
    handleBulkDelete,
    handleOpenCreate,
    handleSaveCoupon,
    confirmDelete
  } = useAdminCoupons();

  const columns: ColumnDef<DBCoupon, unknown>[] = useMemo(
    () => [
      createSelectColumn<DBCoupon>(),
      {
        accessorKey: "code",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.code")} />,
        filterFn: containsFilterFn,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Ticket className="text-muted-foreground h-4 w-4" />
            <span className="font-mono font-bold tracking-wider">{row.original.code}</span>
          </div>
        )
      },
      {
        accessorKey: "discount_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("form.typeLabel")} />
        ),
        filterFn: multiSelectFilterFn,
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.original.discount_type === "percentage"
              ? t("form.percentage")
              : t("form.fixedAmount")}
          </Badge>
        )
      },
      {
        accessorKey: "discount_value",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.discount")} />
        ),
        cell: ({ row }) => <span className="font-semibold">{formatDiscount(row.original)}</span>
      },
      {
        accessorKey: "valid_until",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.expiry")} />,
        cell: ({ row }) => {
          const c = row.original;
          if (!c.valid_until)
            return <span className="text-muted-foreground text-xs">— {t("table.noExpiry")} —</span>;
          const isExpired = getExpiryStatus(c) === "expired";
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="text-muted-foreground h-3.5 w-3.5" />
              <span
                className={isExpired ? "text-destructive font-semibold" : "text-muted-foreground"}>
                {formatDateTime(c.valid_until, locale)}
              </span>
            </div>
          );
        }
      },
      {
        id: "expiryStatus",
        accessorFn: (row) => getExpiryStatus(row),
        header: "Expiry Status",
        filterFn: multiSelectFilterFn,
        cell: ({ row }) => <span className="capitalize">{getExpiryStatus(row.original)}</span>
      },
      {
        accessorKey: "redeemed_count",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.quota")} />,
        cell: ({ row }) => {
          const c = row.original;
          const pct = c.max_redemptions
            ? Math.min(100, (c.redeemed_count / c.max_redemptions) * 100)
            : 0;
          return (
            <div className="max-w-[200px] space-y-1">
              <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {c.redeemed_count} {t("table.redeemed")}
                </span>
                <span>
                  {c.max_redemptions
                    ? `${c.max_redemptions} ${t("table.limit")}`
                    : t("table.unlimited")}
                </span>
              </div>
              {c.max_redemptions ? (
                <Progress value={pct} className="bg-muted h-1.5 w-full" />
              ) : null}
            </div>
          );
        }
      },
      {
        id: "actions",
        header: () => <div className="text-end">{t("table.actions")}</div>,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(row.original)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="me-1 h-4 w-4" /> {t("buttons.delete")}
            </Button>
          </div>
        )
      }
    ],
    [t, locale, formatDiscount, setDeleteTarget]
  );

  const table = useDataTable({
    columns,
    data: coupons,
    initialColumnVisibility: { expiryStatus: false }
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const rawSelectedCoupons = useMemo(() => selectedRows.map((r) => r.original), [selectedRows]);

  const discountTypeOptions = [
    { value: "percentage", label: t("form.percentage") },
    { value: "fixed_amount", label: t("form.fixedAmount") }
  ];

  const expiryStatusOptions = [
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
    { value: "no_expiry", label: t("table.noExpiry") }
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subTitle")}</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="me-1.5 h-4 w-4" /> {t("buttons.create")}
        </Button>
      </div>

      {successMsg && (
        <Alert className="border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          <AlertTitle>{t("alerts.createSuccess")}</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}
      {errorMsg && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{t("alerts.error")}</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-row flex-wrap items-center gap-2">
        <DataTableSearch table={table} columnId="code" placeholder={t("table.search")} />

        <DataTableFacetedFilter
          column={table.getColumn("discount_type")}
          title={t("form.typeLabel")}
          options={discountTypeOptions}
        />

        <DataTableFacetedFilter
          column={table.getColumn("expiryStatus")}
          title={t("table.expiry")}
          options={expiryStatusOptions}
        />

        {selectedRows.length > 0 && (
          <Button
            variant="destructive"
            className="h-9 text-xs"
            onClick={() => setBulkConfirmOpen(true)}>
            <Trash2 className="me-2 h-4 w-4" />
            {t("buttons.delete")} {selectedRows.length} terpilih
          </Button>
        )}

        <DataTableViewOptions table={table} className="md:ms-auto" />
      </div>

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <DataTable table={table} columns={columns} noResultsText={t("table.noData")} />
          <DataTablePagination
            table={table}
            pageSizeOptions={[10, 20, 50, 100]}
            rowsPerPageLabel={t("table.rowsPerPage")}
            selectedLabel={(selected, total) => `${selected} / ${total} dipilih`}
          />
        </>
      )}

      {/* DIALOG: CREATE COUPON */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[480px] rounded-2xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{t("form.title")}</DialogTitle>
            <DialogDescription>{t("form.desc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="coupon-code">{t("form.codeLabel")}</Label>
              <Input
                id="coupon-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder={t("form.codePlaceholder")}
                className="font-mono tracking-wider"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("form.typeLabel")}</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v: any) => setForm((f) => ({ ...f, discountType: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t("form.percentage")}</SelectItem>
                    <SelectItem value="fixed_amount">{t("form.fixedAmount")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="discount-value">{t("form.valueLabel")}</Label>
                <Input
                  id="discount-value"
                  type="number"
                  value={form.discountValue || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountValue: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder={form.discountType === "percentage" ? "20" : "50000"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="max-redemptions">{t("form.quotaLabel")}</Label>
                <Input
                  id="max-redemptions"
                  type="number"
                  value={form.maxRedemptions}
                  onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                  placeholder={t("form.quotaPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valid-until">{t("form.expiryLabel")}</Label>
                <Input
                  id="valid-until"
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-border/60 border-t pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              {t("buttons.cancel")}
            </Button>
            <Button onClick={handleSaveCoupon} disabled={isSaving}>
              {isSaving && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />} {t("buttons.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE (single row) */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("alerts.deleteDesc", { code: deleteTarget?.code ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("buttons.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRM DELETE (bulk, from checkbox selection) */}
      <AlertDialog
        open={bulkConfirmOpen}
        onOpenChange={(open) => !open && setBulkConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("alerts.deleteDesc", { code: `${selectedRows.length} kupon terpilih` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>{t("buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkDelete(rawSelectedCoupons, () => table.resetRowSelection())}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isBulkDeleting && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
              {t("buttons.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
