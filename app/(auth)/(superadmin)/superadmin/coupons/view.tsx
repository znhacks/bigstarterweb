// app/(auth)/(superadmin)/superadmin/coupons/view.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState
} from "@tanstack/react-table";
import {
  Loader2,
  Plus,
  Trash2,
  ShieldAlert,
  Check,
  Ticket,
  Calendar,
  Users,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/i18n/currency";
import { formatDateTime } from "@/lib/i18n/format";

interface DBCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  valid_until: string | null;
  max_redemptions: number | null;
  redeemed_count: number;
  created_at: string;
}

const EMPTY_COUPON_FORM = {
  code: "",
  discountType: "percentage" as "percentage" | "fixed_amount",
  discountValue: 0,
  validUntil: "",
  maxRedemptions: ""
};

export function AdminCouponsPage() {
  const t = useTranslations("superadmin.coupons");
  const locale = useLocale();

  const [coupons, setCoupons] = useState<DBCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_COUPON_FORM });

  // Confirm-delete state
  const [deleteTarget, setDeleteTarget] = useState<DBCoupon | null>(null);

  const showAlert = (type: "success" | "error", msg: string) => {
    if (type === "success") setSuccessMsg(msg);
    else setErrorMsg(msg);
  };

  useEffect(() => {
    if (!successMsg && !errorMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [successMsg, errorMsg]);

  const fetchAdminCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const response = await fetch("/api/admin/coupons", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("alerts.error"));
      setCoupons(data.coupons || []);
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAdminCoupons();
  }, [fetchAdminCoupons]);

  const formatDiscount = useCallback(
    (c: DBCoupon) =>
      c.discount_type === "percentage"
        ? `${parseFloat(String(c.discount_value))}%`
        : formatCurrency(parseFloat(String(c.discount_value)), locale, { currencyCode: "IDR" }),
    [locale]
  );

  const columns = useMemo<ColumnDef<DBCoupon>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <SortHeader column={column} label={t("table.code")} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Ticket className="text-muted-foreground h-4 w-4" />
            <span className="font-mono font-bold tracking-wider">{row.original.code}</span>
          </div>
        )
      },
      {
        accessorKey: "discount_value",
        header: ({ column }) => <SortHeader column={column} label={t("table.discount")} />,
        cell: ({ row }) => (
          <span className="font-semibold">{formatDiscount(row.original)}</span>
        )
      },
      {
        accessorKey: "valid_until",
        header: ({ column }) => <SortHeader column={column} label={t("table.expiry")} />,
        cell: ({ row }) => {
          const c = row.original;
          if (!c.valid_until)
            return <span className="text-muted-foreground text-xs">— {t("table.noExpiry")} —</span>;
          const isExpired = new Date() > new Date(c.valid_until);
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="text-muted-foreground h-3.5 w-3.5" />
              <span className={isExpired ? "text-destructive font-semibold" : "text-muted-foreground"}>
                {formatDateTime(c.valid_until, locale)}
              </span>
            </div>
          );
        }
      },
      {
        accessorKey: "redeemed_count",
        header: ({ column }) => <SortHeader column={column} label={t("table.quota")} />,
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
                <span>{c.max_redemptions ? `${c.max_redemptions} ${t("table.limit")}` : t("table.unlimited")}</span>
              </div>
              {c.max_redemptions ? <Progress value={pct} className="bg-muted h-1.5 w-full" /> : null}
            </div>
          );
        }
      },
      {
        id: "actions",
        header: () => <div className="text-end">{t("table.actions")}</div>,
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
    [t, locale, formatDiscount]
  );

  const table = useReactTable({
    data: coupons,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  const handleOpenCreate = () => {
    setForm({ ...EMPTY_COUPON_FORM });
    setDialogOpen(true);
  };

  const handleSaveCoupon = async () => {
    if (!form.code || !form.discountType || form.discountValue === undefined) {
      showAlert("error", t("alerts.required"));
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          code: form.code,
          discountType: form.discountType,
          discountValue: form.discountValue,
          validUntil: form.validUntil || null,
          maxRedemptions: form.maxRedemptions ? parseInt(form.maxRedemptions) : null
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || t("alerts.error"));

      showAlert("success", t("alerts.createSuccess"));
      setDialogOpen(false);
      fetchAdminCoupons();
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const response = await fetch(`/api/admin/coupons?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || t("alerts.error"));

      showAlert("success", t("alerts.deleteSuccess", { code: deleteTarget.code }));
      fetchAdminCoupons();
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">{t("title")}</h1>
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

      <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
        <CardContent className="p-0">
          {/* Toolbar: search */}
          <div className="border-border/60 flex items-center gap-2 border-b p-3">
            <div className="relative max-w-xs flex-1">
              <Search className="text-muted-foreground absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={t("table.search")}
                className="ps-8"
              />
            </div>
            <Badge variant="secondary" className="ms-auto">
              {table.getFilteredRowModel().rows.length}
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table className="min-w-[800px]">
                <TableHeader className="bg-muted/40 text-xs font-semibold tracking-wider uppercase">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="border-border/60 hover:bg-transparent">
                      {hg.headers.map((header) => (
                        <TableHead key={header.id} className="text-muted-foreground px-6 py-4">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-muted-foreground py-12 text-center">
                        {t("table.noData")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/30">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-6 py-4">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="border-border/60 text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-t p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span>{t("table.rowsPerPage")}</span>
                  <Select
                    value={String(table.getState().pagination.pageSize)}
                    onValueChange={(v) => table.setPageSize(Number(v))}>
                    <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <span>
                    {t("table.page")} {table.getState().pagination.pageIndex + 1} {t("table.of")}{" "}
                    {table.getPageCount() || 1}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
                <Select value={form.discountType} onValueChange={(v: any) => setForm((f) => ({ ...f, discountType: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: parseFloat(e.target.value) || 0 }))}
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

      {/* CONFIRM DELETE (menggantikan browser confirm()) */}
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
    </div>
  );
}

/** Header kolom dengan indikator sort (mirip pola halaman Users). */
function SortHeader({
  column,
  label
}: {
  column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="inline-flex items-center gap-1 hover:opacity-80">
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sorted ? "opacity-100" : "opacity-40"}`} />
    </button>
  );
}
