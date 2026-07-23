// app/(auth)/(superadmin)/superadmin/coupons/view.tsx
"use client";

import React, { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Loader2,
  Plus,
  Trash2,
  ShieldAlert,
  Check,
  Ticket,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
import { formatDateTime, formatNumber } from "@/lib/i18n/format";

import { useDataTable } from "@/components/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { createSelectColumn } from "@/components/data-table/data-table-select-column";
import { multiSelectFilterFn } from "@/components/data-table/data-table-filters";

// MENGIMPOR DATETIME PICKER KUSTOM
import { DateTimePicker } from "@/components/date-time-picker";

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
    selectedCoupon,
    redemptions,
    isLoadingRedemptions,
    deleteTarget,
    setDeleteTarget,
    bulkConfirmOpen,
    setBulkConfirmOpen,
    isBulkDeleting,
    formatDiscount,
    handleBulkDelete,
    handleOpenCreate,
    handleOpenView,
    handleSaveCoupon,
    confirmDelete
  } = useAdminCoupons();

  const isRtl = locale === "ar";
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // State untuk mengontrol Accordion pada Detail Tampilan Kupon
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    details: true,
    redemptionsList: true
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const columns: ColumnDef<DBCoupon, unknown>[] = useMemo(
    () => [
      createSelectColumn<DBCoupon>(),
      {
        accessorKey: "code",
        meta: {
          label: t("table.code")
        },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.code")} />,
        filterFn: containsFilterFn,
        cell: ({ row }) => (
          <button
            onClick={() => handleOpenView(row.original)}
            className="flex items-center gap-2 text-left select-none focus:outline-none">
            <Ticket className="text-muted-foreground h-4 w-4" />
            <span className="text-primary font-mono font-bold tracking-wider">
              {row.original.code}
            </span>
          </button>
        )
      },
      {
        accessorKey: "discount_type",
        meta: {
          label: t("table.discount-type")
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("form.typeLabel")} />
        ),
        filterFn: multiSelectFilterFn,
        cell: ({ row }) => (
          <div onClick={() => handleOpenView(row.original)} className="cursor-pointer select-none">
            <Badge variant="outline" className="capitalize">
              {row.original.discount_type === "percentage"
                ? t("form.percentage")
                : t("form.fixedAmount")}
            </Badge>
          </div>
        )
      },
      {
        accessorKey: "discount_value",
        meta: {
          label: t("table.discount")
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.discount")} />
        ),
        cell: ({ row }) => (
          <div
            onClick={() => handleOpenView(row.original)}
            className="cursor-pointer font-semibold select-none">
            {formatDiscount(row.original)}
          </div>
        )
      },
      {
        accessorKey: "valid_until",
        meta: {
          label: t("table.expiry")
        },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.expiry")} />,
        cell: ({ row }) => {
          const c = row.original;
          const isExpired = getExpiryStatus(c) === "expired";
          return (
            <div onClick={() => handleOpenView(c)} className="cursor-pointer select-none">
              {!c.valid_until ? (
                <span className="text-muted-foreground text-xs">— {t("table.noExpiry")} —</span>
              ) : (
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                  <span
                    className={
                      isExpired ? "text-destructive font-semibold" : "text-muted-foreground"
                    }>
                    {formatDateTime(c.valid_until, locale)}
                  </span>
                </div>
              )}
            </div>
          );
        }
      },
      {
        id: "expiryStatus",
        meta: {
          label: t("table.expiry-status")
        },
        accessorFn: (row) => getExpiryStatus(row),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.expiry-status")} />
        ),
        filterFn: multiSelectFilterFn,
        cell: ({ row }) => <span className="capitalize">{getExpiryStatus(row.original)}</span>
      },
      {
        accessorKey: "redeemed_count",
        meta: {
          label: t("table.quota")
        },
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.quota")} />,
        cell: ({ row }) => {
          const c = row.original;
          const pct = c.max_redemptions
            ? Math.min(100, (c.redeemed_count / c.max_redemptions) * 100)
            : 0;
          return (
            <div
              onClick={() => handleOpenView(c)}
              className="max-w-50 cursor-pointer space-y-1 select-none">
              <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {formatNumber(c.redeemed_count, locale)}{" "}
                  {t("table.redeemed")}
                </span>
                <span>
                  {c.max_redemptions !== null && c.max_redemptions !== undefined
                    ? `${formatNumber(c.max_redemptions, locale)} ${t("table.limit")}`
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
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(row.original)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="me-1 h-4 w-4" />
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
    { value: "active", label: t("table.active") },
    { value: "expired", label: t("table.expired") },
    { value: "no_expiry", label: t("table.noExpiry") }
  ];

  return (
    <div className="mx-auto w-full space-y-6 px-4 py-8">
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
            {t("buttons.delete")} {selectedRows.length}
          </Button>
        )}

        <DataTableViewOptions table={table} className="md:ms-auto" label={t("column")} />
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
            selectedLabel={(selected, total) => `${selected} / ${total} ${t("selected")}`}
          />
        </>
      )}

      {/* PANEL INPUT SAMPING (SLIDE-OVER / SHEET) */}
      {/* 1. Backdrop Overlay */}
      {dialogOpen && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 min-h-full bg-black/40 transition-opacity duration-300"
          onClick={() => setDialogOpen(false)}
        />
      )}

      {/* 2. Container Panel Geser (Mendukung Arah RTL / LTR dan Animasi Sempurna) */}
      <div
        className={`border-border bg-background fixed inset-y-0 z-50 flex h-full w-full flex-col shadow-2xl transition-[transform,opacity] duration-300 ease-in-out sm:max-w-lg md:max-w-xl ${
          isRtl ? "left-0 border-r" : "right-0 border-l"
        } ${
          dialogOpen
            ? "pointer-events-auto translate-x-0 opacity-100"
            : isRtl
              ? "pointer-events-none -translate-x-full opacity-0"
              : "pointer-events-none translate-x-full opacity-0"
        }`}>
        {/* Header Panel */}
        <div className="border-border flex items-center justify-between border-b p-6">
          <div className="space-y-1.5">
            <h2 className="text-foreground text-xl font-bold">
              {selectedCoupon ? `${t("detail.title")} ${selectedCoupon.code}` : t("form.title")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {selectedCoupon ? t("detail.desc") : t("form.desc")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setDialogOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Content (Dinamis: Mode Create atau Mode View) */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {!selectedCoupon ? (
            // MODE TAMBAH DATA (CREATE NEW COUPON)
            <div className="space-y-4">
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
                {/* MODIFIKASI: MENGGUNAKAN DATETIME PICKER KUSTOM UNTUK PEMILIH EXPIRED */}
                <div className="space-y-1.5">
                  <Label htmlFor="valid-until">{t("form.expiryLabel")}</Label>
                  <DateTimePicker
                    date={form.validUntil ? new Date(form.validUntil) : undefined}
                    setDate={(date) =>
                      setForm((f) => ({
                        ...f,
                        validUntil: date ? date.toISOString() : ""
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            // MODE LIHAT DATA (VIEW COUPON DETAILS & REDEMPTIONS LIST)
            <div className="space-y-4">
              {/* ACCORDION 1: DETAIL KUPON */}
              <div className="border-border bg-background overflow-hidden rounded-xl border">
                <button
                  type="button"
                  onClick={() => toggleSection("details")}
                  className="bg-muted/20 hover:bg-muted/40 border-border/40 flex w-full items-center justify-between border-b p-4 text-left transition-colors">
                  <span className="text-foreground text-sm font-semibold">
                    {t("detail.detail-coupon")}
                  </span>
                  {openSections.details ? (
                    <ChevronUp className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <ChevronDown className="text-muted-foreground h-4 w-4" />
                  )}
                </button>

                {openSections.details && (
                  <div className="space-y-4 p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          {t("detail.discount-type")}
                        </Label>
                        <p className="mt-0.5 text-sm font-semibold capitalize">
                          {selectedCoupon.discount_type === "percentage"
                            ? t("form.percentage")
                            : t("form.fixedAmount")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          {t("detail.discount-value")}
                        </Label>
                        <p className="mt-0.5 text-sm font-semibold">
                          {formatDiscount(selectedCoupon)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          {t("detail.expiry")}
                        </Label>
                        <p className="mt-0.5 text-sm font-semibold">
                          {selectedCoupon.valid_until
                            ? formatDateTime(selectedCoupon.valid_until, locale)
                            : t("table.noExpiry")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          {t("detail.coupon-status")}
                        </Label>
                        <div className="mt-0.5">
                          <Badge
                            variant={
                              getExpiryStatus(selectedCoupon) === "active" ? "default" : "secondary"
                            }>
                            {getExpiryStatus(selectedCoupon) === "active"
                              ? t("active")
                              : t("expired")}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="border-border/40 space-y-1.5 border-t pt-2">
                      <div className="text-muted-foreground flex justify-between text-xs font-semibold">
                        <span>{t("detail.usage")}</span>
                        <span>
                          {selectedCoupon.redeemed_count} /{" "}
                          {selectedCoupon.max_redemptions || t("detail.unlimited")}
                        </span>
                      </div>
                      {selectedCoupon.max_redemptions && (
                        <Progress
                          value={Math.min(
                            100,
                            (selectedCoupon.redeemed_count / selectedCoupon.max_redemptions) * 100
                          )}
                          className="bg-muted h-2 w-full"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION 2: DAFTAR PENGGUNA KUPON (TENANT LIST) */}
              <div className="border-border bg-background overflow-hidden rounded-xl border">
                <button
                  type="button"
                  onClick={() => toggleSection("redemptionsList")}
                  className="bg-muted/20 hover:bg-muted/40 border-border/40 flex w-full items-center justify-between border-b p-4 text-left transition-colors">
                  <span className="text-foreground text-sm font-semibold">
                    {t("detail.coupon-users")}
                  </span>
                  {openSections.redemptionsList ? (
                    <ChevronUp className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <ChevronDown className="text-muted-foreground h-4 w-4" />
                  )}
                </button>

                {openSections.redemptionsList && (
                  <div className="space-y-3 p-4">
                    {isLoadingRedemptions ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                      </div>
                    ) : redemptions.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center text-xs">
                        {t("detail.nousage")}
                      </p>
                    ) : (
                      <div className="divide-border/60 border-border bg-muted/5 divide-y overflow-hidden rounded-xl border">
                        {redemptions.map((redemption) => (
                          <div
                            key={redemption.id}
                            className="flex items-center justify-between p-3 text-xs">
                            <span className="text-foreground font-semibold">
                              {redemption.tenant_name}
                            </span>
                            <span className="text-muted-foreground">
                              {formatDateTime(redemption.redeemed_at, locale)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Panel */}
        <div className="border-border bg-muted/20 flex items-center justify-end gap-3 border-t p-6">
          <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
            {t("buttons.cancel")}
          </Button>
          {!selectedCoupon && (
            <Button onClick={handleSaveCoupon} disabled={isSaving}>
              {isSaving && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />} {t("buttons.save")}
            </Button>
          )}
        </div>
      </div>

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
