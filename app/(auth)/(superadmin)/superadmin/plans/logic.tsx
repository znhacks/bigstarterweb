"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { type ColumnDef } from "@tanstack/react-table";
import { Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/i18n/currency";
import { useDataTable } from "@/components/data-table/use-data-table";
import { createSelectColumn } from "@/components/data-table/data-table-select-column";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  FEATURE_DEFINITIONS,
  FeatureDefinition,
  decodeFeatureGates
} from "@/config/feature-definitions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface DBPlan {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  display_features: string[];
  features: string[];
}

export interface DBPrice {
  plan_id: string;
  interval: "monthly" | "yearly";
  amount: number;
  provider_ids: Record<string, string>;
}

export interface PlanRow extends DBPlan {
  monthlyAmount: number;
  yearlyAmount: number;
}

export const ALL_PROVIDER_FIELDS = [
  { key: "stripe", label: "Stripe Price ID (opsional — payment-only jika kosong)" },
  { key: "paypal", label: "PayPal Plan ID (opsional — payment-only jika kosong)" },
  { key: "paddle", label: "Paddle Price ID (wajib)" },
  { key: "lemonsqueezy", label: "LemonSqueezy Variant ID (wajib)" },
  { key: "xendit", label: "Xendit Price/Plan ID (opsional)" },
  { key: "midtrans", label: "Midtrans Price/Plan ID (opsional)" },
  { key: "mayar", label: "Mayar Price/Plan ID (opsional)" }
];

const getEnabledProviders = () => {
  const envString = process.env.NEXT_PUBLIC_ENABLED_PAYMENT_PROVIDERS;
  if (!envString) {
    return ALL_PROVIDER_FIELDS.filter((p) =>
      ["stripe", "paypal", "paddle", "lemonsqueezy"].includes(p.key)
    );
  }
  const envList = envString.split(",").map((item) => item.trim().toLowerCase());
  return ALL_PROVIDER_FIELDS.filter((p) => envList.includes(p.key));
};

export const PROVIDER_FIELDS = getEnabledProviders();

export type ProviderMap = Record<string, string>;
export const emptyProviderMap = (): ProviderMap =>
  PROVIDER_FIELDS.reduce((acc, p) => {
    acc[p.key] = "";
    return acc;
  }, {} as ProviderMap);

export const EMPTY_FORM = {
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

const containsFilterFn = (row: any, columnId: string, filterValue: string) => {
  if (!filterValue) return true;
  return String(row.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase());
};

export function useAdminPlans() {
  const t = useTranslations("superadmin.plans");
  const locale = useLocale();

  const [plans, setPlans] = useState<DBPlan[]>([]);
  const [prices, setPrices] = useState<DBPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formGates, setFormGates] = useState<Record<string, any>>({});
  const [deactivateTarget, setDeactivateTarget] = useState<DBPlan | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);

  const [isMonthlyEnabled, setIsMonthlyEnabled] = useState(false);
  const [isYearlyEnabled, setIsYearlyEnabled] = useState(false);
  const [enabledMonthlyProviders, setEnabledMonthlyProviders] = useState<Record<string, boolean>>(
    {}
  );
  const [enabledYearlyProviders, setEnabledYearlyProviders] = useState<Record<string, boolean>>({});

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

  const handleOpenEdit = useCallback(
    (plan: DBPlan) => {
      setIsEditMode(true);
      const mPrice = prices.find((p) => p.plan_id === plan.id && p.interval === "monthly");
      const yPrice = prices.find((p) => p.plan_id === plan.id && p.interval === "yearly");

      setIsMonthlyEnabled(!!mPrice);
      setIsYearlyEnabled(!!yPrice);

      const activeMonthlyProvs: Record<string, boolean> = {};
      const activeYearlyProvs: Record<string, boolean> = {};

      PROVIDER_FIELDS.forEach((pf) => {
        activeMonthlyProvs[pf.key] = !!mPrice?.provider_ids?.[pf.key];
        activeYearlyProvs[pf.key] = !!yPrice?.provider_ids?.[pf.key];
      });

      setEnabledMonthlyProviders(activeMonthlyProvs);
      setEnabledYearlyProviders(activeYearlyProvs);

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

      const activeGates = decodeFeatureGates(plan.features);
      setFormGates(activeGates);
      setDialogOpen(true);
    },
    [prices]
  );

  const columns: ColumnDef<PlanRow, unknown>[] = useMemo(
    () => [
      createSelectColumn<PlanRow>(),
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.name")} />,
        filterFn: containsFilterFn,
        cell: ({ row }) => (
          <div>
            <p className="font-bold">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-xs">{row.original.id}</p>
          </div>
        )
      },
      {
        accessorKey: "monthlyAmount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.monthly")} />
        ),
        cell: ({ row }) => (
          <span className="font-semibold">{fmtIDR(row.original.monthlyAmount)}</span>
        )
      },
      {
        accessorKey: "yearlyAmount",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.yearly")} />,
        cell: ({ row }) => (
          <span className="font-semibold">{fmtIDR(row.original.yearlyAmount)}</span>
        )
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.status")} />,
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
        enableHiding: false,
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
    [t, fmtIDR, handleOpenEdit]
  );

  const table = useDataTable({ columns, data: rows });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedActiveCount = selectedRows.filter((r) => r.original.is_active).length;

  const handleBulkDeactivate = async () => {
    const targets = selectedRows.map((r) => r.original).filter((p) => p.is_active);
    if (targets.length === 0) return;

    setIsBulkDeactivating(true);
    setErrorMsg(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const results = await Promise.all(
        targets.map((p) =>
          fetch(`/api/admin/plans?id=${p.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.access_token}` }
          }).then((r) => r.json().then((data) => ({ ok: r.ok && !data.error, id: p.id })))
        )
      );
      const failedCount = results.filter((r) => !r.ok).length;

      if (failedCount > 0) {
        showAlert(
          "error",
          `${targets.length - failedCount} berhasil dinonaktifkan, ${failedCount} gagal.`
        );
      } else {
        showAlert("success", t("alerts.deactivateSuccess"));
      }

      table.resetRowSelection();
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setIsBulkDeactivating(false);
      setBulkConfirmOpen(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setIsMonthlyEnabled(false);
    setIsYearlyEnabled(false);

    const emptyProvs: Record<string, boolean> = {};
    PROVIDER_FIELDS.forEach((pf) => {
      emptyProvs[pf.key] = false;
    });
    setEnabledMonthlyProviders(emptyProvs);
    setEnabledYearlyProviders(emptyProvs);

    setForm({
      ...EMPTY_FORM,
      monthlyProviders: emptyProviderMap(),
      yearlyProviders: emptyProviderMap()
    });

    const defaultGates = decodeFeatureGates([]);
    setFormGates(defaultGates);
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

      const filteredMonthlyProviders = { ...form.monthlyProviders };
      const filteredYearlyProviders = { ...form.yearlyProviders };

      PROVIDER_FIELDS.forEach((pf) => {
        if (!isMonthlyEnabled || !enabledMonthlyProviders[pf.key]) {
          filteredMonthlyProviders[pf.key] = "";
        }
        if (!isYearlyEnabled || !enabledYearlyProviders[pf.key]) {
          filteredYearlyProviders[pf.key] = "";
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
          monthly: {
            amount: isMonthlyEnabled ? form.monthlyAmount : 0,
            providerIds: filteredMonthlyProviders
          },
          yearly: {
            amount: isYearlyEnabled ? form.yearlyAmount : 0,
            providerIds: filteredYearlyProviders
          }
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

  return {
    t,
    isLoading,
    isSaving,
    errorMsg,
    successMsg,
    dialogOpen,
    setDialogOpen,
    isEditMode,
    form,
    setForm,
    formGates,
    setFormGates,
    deactivateTarget,
    setDeactivateTarget,
    bulkConfirmOpen,
    setBulkConfirmOpen,
    isBulkDeactivating,
    isMonthlyEnabled,
    setIsMonthlyEnabled,
    isYearlyEnabled,
    setIsYearlyEnabled,
    enabledMonthlyProviders,
    setEnabledMonthlyProviders,
    enabledYearlyProviders,
    setEnabledYearlyProviders,
    table,
    columns,
    selectedRows,
    selectedActiveCount,
    handleOpenCreate,
    handleSavePlan,
    confirmDeactivate,
    handleBulkDeactivate
  };
}
