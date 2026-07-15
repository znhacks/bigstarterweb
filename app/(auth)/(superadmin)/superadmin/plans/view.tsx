// app/(auth)/(superadmin)/superadmin/plans/view.tsx
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
  Edit,
  ShieldAlert,
  Check,
  Info,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { FEATURE_DEFINITIONS, FeatureDefinition } from "@/config/feature-definitions";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/i18n/currency";

interface DBPlan {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  display_features: string[];
  features: string[];
}

interface DBPrice {
  plan_id: string;
  interval: "monthly" | "yearly";
  amount: number;
  provider_ids: Record<string, string>;
}

interface PlanRow extends DBPlan {
  monthlyAmount: number;
  yearlyAmount: number;
}

// Hanya provider yg MEMERLUIKAN plan/price/variant ID di sisi provider yg ditampilkan.
// Mayar/Midtrans/Xendit = payment-only (charge amount langsung, tanpa plan provider) → tidak butuh ID.
// Braintree = disabled. Stripe & PayPal juga mendukung payment-only (ID opsional).
const PROVIDER_FIELDS: { key: string; label: string }[] = [
  { key: "stripe", label: "Stripe Price ID (opsional — payment-only jika kosong)" },
  { key: "paypal", label: "PayPal Plan ID (opsional — payment-only jika kosong)" },
  { key: "paddle", label: "Paddle Price ID (wajib)" },
  { key: "lemonsqueezy", label: "LemonSqueezy Variant ID (wajib)" }
];

type ProviderMap = Record<string, string>;
const emptyProviderMap = (): ProviderMap =>
  PROVIDER_FIELDS.reduce((acc, p) => {
    acc[p.key] = "";
    return acc;
  }, {} as ProviderMap);

const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
  isActive: true,
  displayFeaturesRaw: "",
  monthlyAmount: 0,
  yearlyAmount: 0,
  monthlyProviders: emptyProviderMap(),
  yearlyProviders: emptyProviderMap()
};

export function AdminPlansPage() {
  const t = useTranslations("superadmin.plans");
  const locale = useLocale();

  const [plans, setPlans] = useState<DBPlan[]>([]);
  const [prices, setPrices] = useState<DBPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formGates, setFormGates] = useState<Record<string, any>>({});
  const [deactivateTarget, setDeactivateTarget] = useState<DBPlan | null>(null);

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

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const response = await fetch("/api/admin/plans", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("alerts.error"));

      setPlans(data.plans || []);
      setPrices(data.prices || []);
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Gabungkan plan + harga jadi row tabel
  const rows = useMemo<PlanRow[]>(() => {
    return plans.map((p) => {
      const m = prices.find((pr) => pr.plan_id === p.id && pr.interval === "monthly");
      const y = prices.find((pr) => pr.plan_id === p.id && pr.interval === "yearly");
      return {
        ...p,
        monthlyAmount: m ? parseFloat(String(m.amount)) : 0,
        yearlyAmount: y ? parseFloat(String(y.amount)) : 0
      };
    });
  }, [plans, prices]);

  const fmtIDR = useCallback(
    (amt: number) => formatCurrency(amt, locale, { currencyCode: "IDR" }),
    [locale]
  );

  const columns = useMemo<ColumnDef<PlanRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortHeader column={column} label={t("table.name")} />,
        cell: ({ row }) => (
          <div>
            <p className="font-bold">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-xs">{row.original.id}</p>
          </div>
        )
      },
      {
        accessorKey: "monthlyAmount",
        header: ({ column }) => <SortHeader column={column} label={t("table.monthly")} />,
        cell: ({ row }) => <span className="font-semibold">{fmtIDR(row.original.monthlyAmount)}</span>
      },
      {
        accessorKey: "yearlyAmount",
        header: ({ column }) => <SortHeader column={column} label={t("table.yearly")} />,
        cell: ({ row }) => <span className="font-semibold">{fmtIDR(row.original.yearlyAmount)}</span>
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => <SortHeader column={column} label={t("table.status")} />,
        cell: ({ row }) => (
          <Badge
            variant={row.original.is_active ? "default" : "secondary"}
            className={
              row.original.is_active
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                : ""
            }>
            {row.original.is_active ? t("table.active") : t("table.inactive")}
          </Badge>
        )
      },
      {
        id: "actions",
        header: () => <div className="text-end">{t("table.actions")}</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2 whitespace-nowrap">
            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(row.original)}>
              <Edit className="me-1 h-3.5 w-3.5" /> {t("buttons.edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeactivateTarget(row.original)}
              disabled={!row.original.is_active}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              {t("buttons.deactivate")}
            </Button>
          </div>
        )
      }
    ],
    [t, fmtIDR] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const table = useReactTable({
    data: rows,
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
    setIsEditMode(false);
    setForm({ ...EMPTY_FORM, monthlyProviders: emptyProviderMap(), yearlyProviders: emptyProviderMap() });
    const defaultGates: Record<string, any> = {};
    FEATURE_DEFINITIONS.forEach((def) => (defaultGates[def.key] = def.defaultValue));
    setFormGates(defaultGates);
    setDialogOpen(true);
  };

  const handleOpenEdit = (plan: DBPlan) => {
    setIsEditMode(true);
    const mPrice = prices.find((p) => p.plan_id === plan.id && p.interval === "monthly");
    const yPrice = prices.find((p) => p.plan_id === plan.id && p.interval === "yearly");

    const toMap = (price?: DBPrice): ProviderMap => {
      const m = emptyProviderMap();
      if (price?.provider_ids) {
        PROVIDER_FIELDS.forEach((pf) => {
          m[pf.key] = price.provider_ids?.[pf.key] || "";
        });
      }
      return m;
    };

    setForm({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      isActive: plan.is_active,
      displayFeaturesRaw: plan.display_features.join("\n"),
      monthlyAmount: mPrice ? parseFloat(String(mPrice.amount)) : 0,
      yearlyAmount: yPrice ? parseFloat(String(yPrice.amount)) : 0,
      monthlyProviders: toMap(mPrice),
      yearlyProviders: toMap(yPrice)
    });

    const activeGates: Record<string, any> = {};
    FEATURE_DEFINITIONS.forEach((def) => {
      if (def.type === "boolean") {
        activeGates[def.key] = plan.features.includes(def.key);
      } else {
        const prefix = `limit:${def.key}:`;
        const match = plan.features.find((item) => item.startsWith(prefix));
        activeGates[def.key] = match ? parseInt(match.split(":")[2]) : def.defaultValue;
      }
    });
    setFormGates(activeGates);
    setDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!form.id || !form.name || !form.description) {
      showAlert("error", t("form.required"));
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const compiledFeatures: string[] = [];
      FEATURE_DEFINITIONS.forEach((def) => {
        const value = formGates[def.key];
        if (def.type === "boolean") {
          if (value === true) compiledFeatures.push(def.key);
        } else {
          compiledFeatures.push(`limit:${def.key}:${value || 0}`);
        }
      });

      const payload = {
        id: form.id,
        name: form.name,
        description: form.description,
        isActive: form.isActive,
        displayFeatures: form.displayFeaturesRaw
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
        features: compiledFeatures,
        prices: {
          monthly: { amount: form.monthlyAmount, providerIds: form.monthlyProviders },
          yearly: { amount: form.yearlyAmount, providerIds: form.yearlyProviders }
        }
      };

      const response = await fetch("/api/admin/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || t("alerts.error"));

      showAlert("success", t("alerts.saveSuccess"));
      setDialogOpen(false);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const response = await fetch(`/api/admin/plans?id=${deactivateTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || t("alerts.error"));

      showAlert("success", t("alerts.deactivateSuccess"));
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setDeactivateTarget(null);
    }
  };

  // Render blok input provider (dinamis, semua 8 provider)
  const renderProviderBlock = (
    cycle: "monthly" | "yearly",
    amount: number,
    providers: ProviderMap
  ) => (
    <div className="border-border/60 bg-muted/20 space-y-4 rounded-xl border p-4">
      <div className="space-y-1">
        <Label className="text-sm font-bold">
          {cycle === "monthly" ? t("form.monthlyCycle") : t("form.yearlyCycle")}
        </Label>
        <Input
          type="number"
          value={amount || ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              [cycle === "monthly" ? "monthlyAmount" : "yearlyAmount"]: parseFloat(e.target.value) || 0
            }))
          }
          placeholder={t("form.basePricePlaceholder")}
        />
      </div>
      <div className="border-border/60 space-y-2 border-t pt-3">
        <p className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
          {t("form.gatewayIds")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDER_FIELDS.map((pf) => (
            <div key={pf.key} className="space-y-1">
              <Label className="text-[11px]">{pf.label}</Label>
              <Input
                value={providers[pf.key] || ""}
                onChange={(e) =>
                  setForm((f) => {
                    const key = cycle === "monthly" ? "monthlyProviders" : "yearlyProviders";
                    return { ...f, [key]: { ...f[key], [pf.key]: e.target.value } };
                  })
                }
                className="h-8 font-mono text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
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
          <AlertTitle>{t("alerts.saveSuccess")}</AlertTitle>
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

      {/* DIALOG: CREATE / EDIT PLAN */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-[700px] overflow-y-auto rounded-2xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isEditMode ? t("form.titleEdit") : t("form.titleCreate")}
            </DialogTitle>
            <DialogDescription>{t("form.desc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 1. INFORMASI DASAR */}
            <div className="border-border/60 space-y-4 border-b pb-4">
              <h3 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                {t("form.sectionInfo")}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-id">{t("form.planId")}</Label>
                  <Input
                    id="plan-id"
                    disabled={isEditMode}
                    value={form.id}
                    onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                    placeholder={t("form.planIdPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-name">{t("form.planName")}</Label>
                  <Input
                    id="plan-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={t("form.planNamePlaceholder")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-desc">{t("form.description")}</Label>
                <Input
                  id="plan-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t("form.descriptionPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-display">{t("form.displayFeatures")}</Label>
                <Textarea
                  id="plan-display"
                  rows={3}
                  value={form.displayFeaturesRaw}
                  onChange={(e) => setForm((f) => ({ ...f, displayFeaturesRaw: e.target.value }))}
                  placeholder={t("form.displayFeaturesPlaceholder")}
                />
              </div>
            </div>

            {/* 2. FEATURE GATING DINAMIS */}
            <div className="border-border/60 space-y-4 border-b pb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t("form.sectionFeatures")}
                </h3>
                <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  <Info className="me-0.5 h-3 w-3" /> {t("form.dynamic")}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FEATURE_DEFINITIONS.map((def: FeatureDefinition) => (
                  <div
                    key={def.key}
                    className="border-border/60 bg-muted/20 flex flex-col justify-between gap-2 rounded-xl border p-3.5">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">{def.label}</Label>
                      <p className="text-muted-foreground text-[10px] leading-normal">{def.description}</p>
                    </div>
                    <div className="pt-2">
                      {def.type === "boolean" ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!!formGates[def.key]}
                            onCheckedChange={(checked) =>
                              setFormGates((prev) => ({ ...prev, [def.key]: checked }))
                            }
                          />
                          <span className="text-muted-foreground text-xs font-medium">
                            {formGates[def.key] ? t("form.gateActive") : t("form.gateInactive")}
                          </span>
                        </div>
                      ) : (
                        <Input
                          type="number"
                          value={formGates[def.key] || 0}
                          onChange={(e) =>
                            setFormGates((prev) => ({
                              ...prev,
                              [def.key]: parseInt(e.target.value) || 0
                            }))
                          }
                          className="h-8 max-w-[120px] text-xs"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. HARGA & ID GATEWAY */}
            <div className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                {t("form.sectionBilling")}
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {renderProviderBlock("monthly", form.monthlyAmount, form.monthlyProviders)}
                {renderProviderBlock("yearly", form.yearlyAmount, form.yearlyProviders)}
              </div>
            </div>
          </div>

          <DialogFooter className="border-border/60 border-t pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              {t("buttons.back")}
            </Button>
            <Button onClick={handleSavePlan} disabled={isSaving}>
              {isSaving && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />} {t("buttons.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DEACTIVATE */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deactivateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("alerts.deactivateDesc", { name: deactivateTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("buttons.confirmDeactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
