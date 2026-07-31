"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { type ColumnDef } from "@tanstack/react-table";
import { Trash2, Ban, MoreVertical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/i18n/currency";
import { getLocalizedValue } from "@/lib/i18n/localize";
import {
  useDataGrid,
  createSelectColumn,
  actionCol,
  numCol,
  textCol
} from "@/components/data-table";
import { FEATURE_DEFINITIONS, decodeFeatureGates } from "@/config/feature-definitions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { routing } from "@/i18n/routing";
import { APP_BASE_CURRENCY } from "@/config/billing-rates";
import { formatNumber } from "@/lib/i18n/format";

export interface DBPlan {
  id: string;
  name: Record<string, string> | string;
  description: Record<string, string> | string;
  is_active: boolean;
  display_features: Record<string, string[]> | string[];
  features: string[];
  is_enterprise?: boolean;
  is_recommended?: boolean;
  trial_days?: number;
  sort_order?: number;
  weight?: number;
}

export interface DBPrice {
  plan_id: string;
  interval: "monthly" | "yearly";
  amount: number;
  currency?: string;
  provider_ids: Record<string, string>;
}

export interface PlanRow extends DBPlan {
  monthlyAmount: number;
  monthlyCurrency: string;
  yearlyAmount: number;
  yearlyCurrency: string;
}

const LOCALE_METADATA: Record<string, { label: string; placeholder: string }> = {
  en: { label: "English", placeholder: "Inggris" },
  id: { label: "Indonesia", placeholder: "Indonesia" },
  ar: { label: "العربية", placeholder: "Arab" },
  ja: { label: "日本語", placeholder: "Jepang" },
  zh: { label: "中文", placeholder: "Mandarin" },
  ko: { label: "한국어", placeholder: "Korea" },
  fr: { label: "Français", placeholder: "Prancis" },
  de: { label: "Deutsch", placeholder: "Jerman" },
  es: { label: "Español", placeholder: "Spanyol" },
  pt: { label: "Português", placeholder: "Portugis" },
  ru: { label: "Русский", placeholder: "Rusia" },
  it: { label: "Italiano", placeholder: "Italia" },
  th: { label: "ไทย", placeholder: "Thailand" },
  vi: { label: "Tiếng Việt", placeholder: "Vietnam" }
};

export const SUPPORTED_LOCALES = routing.locales.map((code) => {
  const meta = LOCALE_METADATA[code as keyof typeof LOCALE_METADATA];
  return {
    code,
    label: meta?.label || `${code.toUpperCase()} (${code.toUpperCase()})`,
    placeholder: meta?.placeholder || code.toUpperCase()
  };
});

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]["code"];

export const ALL_PROVIDER_FIELDS = [
  { key: "stripe", label: "Stripe Price ID" },
  { key: "paypal", label: "PayPal Plan ID" },
  { key: "paddle", label: "Paddle Price ID" },
  { key: "lemonsqueezy", label: "LemonSqueezy Variant ID" },
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

const createEmptyMultilingualField = (): Record<string, string> => {
  const fields: Record<string, string> = {};
  SUPPORTED_LOCALES.forEach((locale) => {
    fields[locale.code] = "";
  });
  return fields;
};

export const EMPTY_FORM = {
  id: "",
  name: createEmptyMultilingualField(),
  description: createEmptyMultilingualField(),
  isActive: true,
  isEnterprise: false,
  isRecommended: false,
  trialDays: 0,
  sortOrder: "",
  displayFeaturesRaw: createEmptyMultilingualField(),
  monthlyAmount: 0,
  monthlyCurrency: "IDR",
  monthlyProductId: "",
  yearlyAmount: 0,
  yearlyCurrency: "IDR",
  yearlyProductId: "",
  monthlyProviders: emptyProviderMap(),
  yearlyProviders: emptyProviderMap()
};

export { getLocalizedValue };

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formGates, setFormGates] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    features: false,
    billing: false
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const [deactivateTarget, setDeactivateTarget] = useState<DBPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DBPlan | null>(null);

  const [conflictTarget, setConflictTarget] = useState<{ order: number; planName: string } | null>(
    null
  );

  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);

  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [activeFormTab, setActiveFormTab] = useState<SupportedLocale>(
    SUPPORTED_LOCALES[0]?.code || "en"
  );

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
        monthlyCurrency: (m as any)?.currency || "IDR",
        yearlyAmount: y ? parseFloat(String(y.amount)) : 0,
        yearlyCurrency: (y as any)?.currency || "IDR"
      };
    });
  }, [plans, prices]);

  const fmtPrice = useCallback(
    (amt: number, currency: string = APP_BASE_CURRENCY) =>
      formatCurrency(amt, locale, { currencyCode: currency }),
    [locale]
  );

  const handleOpenEdit = useCallback(
    (plan: DBPlan) => {
      setIsEditMode(true);
      setErrors({});
      setOpenSections({ general: true, features: false, billing: false });

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

      const getLangObject = (val: any): Record<string, string> => {
        const obj: Record<string, string> = {};
        SUPPORTED_LOCALES.forEach((locale) => {
          obj[locale.code] = "";
        });

        if (val && typeof val === "object" && !Array.isArray(val)) {
          SUPPORTED_LOCALES.forEach((locale) => {
            obj[locale.code] = val[locale.code] || "";
          });
          return obj;
        }

        const primaryLocale = SUPPORTED_LOCALES[0]?.code || "en";
        obj[primaryLocale] = String(val || "");
        return obj;
      };

      const getLangArrayRaw = (val: any): Record<string, string> => {
        const obj: Record<string, string> = {};
        SUPPORTED_LOCALES.forEach((locale) => {
          obj[locale.code] = "";
        });

        if (val && typeof val === "object" && !Array.isArray(val)) {
          SUPPORTED_LOCALES.forEach((locale) => {
            const content = val[locale.code];
            obj[locale.code] = Array.isArray(content) ? content.join("\n") : "";
          });
          return obj;
        }

        const primaryLocale = SUPPORTED_LOCALES[0]?.code || "en";
        obj[primaryLocale] = Array.isArray(val) ? val.join("\n") : "";
        return obj;
      };

      setForm({
        id: plan.id,
        name: getLangObject(plan.name),
        description: getLangObject(plan.description),
        isActive: plan.is_active,
        isEnterprise: !!plan.is_enterprise,
        isRecommended: !!plan.is_recommended,
        trialDays: plan.trial_days || 0,
        sortOrder:
          plan.sort_order !== undefined
            ? String(plan.sort_order)
            : plan.weight !== undefined
              ? String(plan.weight)
              : "",
        displayFeaturesRaw: getLangArrayRaw(plan.display_features),
        monthlyAmount: mPrice ? parseFloat(String(mPrice.amount)) : 0,
        monthlyCurrency: (mPrice as any)?.currency || "IDR",
        monthlyProductId: (mPrice as any)?.product_id || "",
        yearlyAmount: yPrice ? parseFloat(String(yPrice.amount)) : 0,
        yearlyCurrency: (yPrice as any)?.currency || "IDR",
        yearlyProductId: (yPrice as any)?.product_id || "",
        monthlyProviders: toMap(mPrice),
        yearlyProviders: toMap(yPrice)
      });

      const activeGates = decodeFeatureGates(plan.features);
      setFormGates(activeGates);
      setDialogOpen(true);
    },
    [prices]
  );

  const columns: ColumnDef<PlanRow>[] = [
    {
      ...createSelectColumn<PlanRow>(),
      cell: (props) => {
        const baseSelect = createSelectColumn<PlanRow>();
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {typeof baseSelect.cell === "function"
              ? (baseSelect.cell as any)(props)
              : (baseSelect.cell as any)}
          </div>
        );
      }
    },
    textCol<PlanRow>({
      key: "name",
      header: t("table.name"),
      filterFn: (row, _columnId, filterValue: string) => {
        if (!filterValue) return true;
        return getLocalizedValue(row.original.name, locale)
          .toLowerCase()
          .includes(String(filterValue).toLowerCase());
      },
      cell: (row) => {
        const nameStr = getLocalizedValue(row.name, locale);
        return (
          <div
            className="w-full cursor-pointer space-y-0.5 select-none"
            onClick={() => handleOpenEdit(row)}>
            <div className="flex items-center gap-2">
              <p className="font-bold">{nameStr}</p>
              {(row.sort_order !== undefined || row.weight !== undefined) && (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  {t("table.order", {
                    order: formatNumber(row.sort_order ?? row.weight ?? 0, locale)
                  })}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground font-mono text-xs">{row.id}</p>
          </div>
        );
      }
    }),
    numCol<PlanRow>({
      key: "monthlyAmount",
      header: t("table.monthly"),
      cell: (row) => (
        <div
          className="w-full cursor-pointer font-semibold select-none"
          onClick={() => handleOpenEdit(row)}>
          {fmtPrice(row.monthlyAmount, row.monthlyCurrency)}
        </div>
      )
    }),
    numCol<PlanRow>({
      key: "yearlyAmount",
      header: t("table.yearly"),
      cell: (row) => (
        <div
          className="w-full cursor-pointer font-semibold select-none"
          onClick={() => handleOpenEdit(row)}>
          {fmtPrice(row.yearlyAmount, row.yearlyCurrency)}
        </div>
      )
    }),
    textCol<PlanRow>({
      key: "is_active",
      header: t("table.status"),
      cell: (row) => (
        <div className="w-full cursor-pointer select-none" onClick={() => handleOpenEdit(row)}>
          <Badge
            variant={row.is_active ? "default" : "secondary"}
            className={
              row.is_active
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                : ""
            }>
            {row.is_active ? t("table.active") : t("table.inactive")}
          </Badge>
        </div>
      )
    }),
    actionCol<PlanRow>({
      header: t("table.actions"),
      enableHiding: false,
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
                disabled={!row.is_active}
                onClick={() => setDeactivateTarget(row)}
                className="text-amber-600 focus:text-amber-600 dark:text-amber-500">
                <Ban className="me-2 h-4 w-4" /> {t("buttons.deactivate")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(row)}
                className="text-destructive focus:text-destructive">
                <Trash2 className="me-2 h-4 w-4" /> {t("buttons.delete") || "Hapus"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    })
  ];

  const table = useDataGrid({
    columns,
    data: rows,
    globalFilterFn: (row, columnId, filterValue: string) => {
      const term = String(filterValue ?? "")
        .toLowerCase()
        .trim();
      if (!term) return true;
      if (columnId === "name") {
        return getLocalizedValue(row.original.name, locale).toLowerCase().includes(term);
      }
      const val = row.getValue(columnId);
      return val != null && String(val).toLowerCase().includes(term);
    }
  });

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
          t("successDeactive", {
            result: targets.length - failedCount,
            failedCount: failedCount
          })
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

  const handleBulkDelete = async () => {
    const targets = selectedRows.map((r) => r.original);
    if (targets.length === 0) return;

    setIsBulkDeleting(true);
    setErrorMsg(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const results = await Promise.all(
        targets.map((p) =>
          fetch(`/api/admin/plans?id=${p.id}&action=delete`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.access_token}` }
          }).then((r) => r.json().then((data) => ({ ok: r.ok && !data.error, id: p.id })))
        )
      );
      const failedCount = results.filter((r) => !r.ok).length;

      if (failedCount > 0) {
        showAlert(
          "error",
          t("successDeleted", {
            result: targets.length - failedCount,
            failedCount: failedCount
          })
        );
      } else {
        showAlert("success", t("alerts.deleteSuccess"));
      }

      table.resetRowSelection();
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteConfirmOpen(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setIsMonthlyEnabled(false);
    setIsYearlyEnabled(false);
    setErrors({});
    setOpenSections({ general: true, features: false, billing: false });

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

  const handleSavePlan = async (bypassConflict = false) => {
    const primaryLocale = SUPPORTED_LOCALES[0]?.code || "en";
    const validationErrors: Record<string, string> = {};

    if (!form.id || form.id.trim() === "") {
      validationErrors.id = t("form.errors.idRequired");
    }

    if (!form.name[primaryLocale] || form.name[primaryLocale].trim() === "") {
      validationErrors.name = t("form.errors.nameRequired");
    }

    if (!form.description[primaryLocale] || form.description[primaryLocale].trim() === "") {
      validationErrors.description = t("form.errors.descRequired");
    }

    if (!form.isEnterprise) {
      const hasMonthly = isMonthlyEnabled && form.monthlyAmount > 0;
      const hasYearly = isYearlyEnabled && form.yearlyAmount > 0;
      if (!hasMonthly && !hasYearly) {
        validationErrors.billing = t("form.errors.billingRequired");
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setOpenSections((prev) => ({
        ...prev,
        general: !!(validationErrors.id || validationErrors.name || validationErrors.description),
        billing: !!validationErrors.billing
      }));
      return;
    }

    setErrors({});

    let calculatedSortOrder = form.sortOrder.trim() !== "" ? parseInt(form.sortOrder, 10) : null;
    if (calculatedSortOrder === null || isNaN(calculatedSortOrder)) {
      const maxSortOrder = plans.reduce((max, p) => {
        const val = p.sort_order ?? p.weight ?? 0;
        return val > max ? val : max;
      }, 0);
      calculatedSortOrder = maxSortOrder + 1;
    }

    if (!bypassConflict) {
      const conflictingPlan = plans.find(
        (p) =>
          p.id !== form.id &&
          (p.sort_order === calculatedSortOrder || p.weight === calculatedSortOrder)
      );

      if (conflictingPlan) {
        setConflictTarget({
          order: calculatedSortOrder,
          planName: getLocalizedValue(conflictingPlan.name, locale)
        });
        return;
      }
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
          if (value === true) {
            compiledFeatures.push(def.key);
          }
        } else if (def.type === "number") {
          compiledFeatures.push(`limit:${def.key}:${value ?? def.defaultValue}`);
        } else if (def.type === "select") {
          compiledFeatures.push(`select:${def.key}:${value ?? def.defaultValue}`);
        } else if (def.type === "string") {
          compiledFeatures.push(`string:${def.key}:${value ?? def.defaultValue}`);
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

      const displayFeaturesCompiled: Record<string, string[]> = {};
      SUPPORTED_LOCALES.forEach((locale) => {
        const rawContent = form.displayFeaturesRaw[locale.code] || "";
        displayFeaturesCompiled[locale.code] = rawContent
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean);
      });

      const payload = {
        id: form.id,
        name: form.name,
        description: form.description,
        isActive: form.isActive,
        isEnterprise: form.isEnterprise,
        isRecommended: form.isRecommended,
        trialDays: form.trialDays,
        sortOrder: calculatedSortOrder,
        sort_order: calculatedSortOrder,
        weight: calculatedSortOrder,
        resolveConflict: bypassConflict,
        displayFeatures: displayFeaturesCompiled,
        features: compiledFeatures,
        prices: {
          monthly: {
            amount: isMonthlyEnabled ? form.monthlyAmount : 0,
            currency: form.monthlyCurrency || "IDR",
            productId: form.monthlyProductId || null
          },
          yearly: {
            amount: isYearlyEnabled ? form.yearlyAmount : 0,
            currency: form.yearlyCurrency || "IDR",
            productId: form.yearlyProductId || null
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const response = await fetch(`/api/admin/plans?id=${deleteTarget.id}&action=delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || t("alerts.error"));

      showAlert("success", t("alerts.deleteSuccess"));
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const translationStatus = useMemo(() => {
    return SUPPORTED_LOCALES.map((lang) => {
      const isNameFilled = !!form.name[lang.code]?.trim();
      const isDescFilled = !!form.description[lang.code]?.trim();
      return {
        code: lang.code,
        label: lang.label,
        isFilled: isNameFilled && isDescFilled
      };
    });
  }, [form.name, form.description]);

  const completedLanguagesCount = useMemo(() => {
    return translationStatus.filter((s) => s.isFilled).length;
  }, [translationStatus]);

  const activeLangMeta = SUPPORTED_LOCALES.find((lang) => lang.code === activeFormTab);
  const activePlaceholderLabel = activeLangMeta?.placeholder || activeFormTab;

  const [featureSearch, setFeatureSearch] = React.useState("");

  const filteredFeatures = React.useMemo(() => {
    if (!featureSearch.trim()) return FEATURE_DEFINITIONS;
    return FEATURE_DEFINITIONS.filter((def) =>
      def.label.toLowerCase().includes(featureSearch.toLowerCase())
    );
  }, [featureSearch]);

  const numericFeatures = React.useMemo(() => {
    return filteredFeatures.filter((def) => def.type !== "boolean");
  }, [filteredFeatures]);

  const booleanFeatures = React.useMemo(() => {
    return filteredFeatures.filter((def) => def.type === "boolean");
  }, [filteredFeatures]);

  const customFeatures = React.useMemo(() => {
    return filteredFeatures.filter((def) => def.type === "select" || def.type === "string");
  }, [filteredFeatures]);

  return {
    t,
    locale,
    isLoading,
    isSaving,
    isDeleting,
    errorMsg,
    successMsg,
    dialogOpen,
    setDialogOpen,
    isEditMode,
    form,
    setForm,
    formGates,
    setFormGates,
    errors,
    setErrors,
    openSections,
    toggleSection,
    deactivateTarget,
    setDeactivateTarget,
    deleteTarget,
    setDeleteTarget,
    conflictTarget,
    setConflictTarget,
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
    handleOpenEdit,
    handleSavePlan,
    confirmDeactivate,
    confirmDelete,
    handleBulkDeactivate,
    activeFormTab,
    setActiveFormTab,
    translationStatus,
    completedLanguagesCount,
    featureSearch,
    setFeatureSearch,
    filteredFeatures,
    numericFeatures,
    booleanFeatures,
    customFeatures,

    bulkDeleteConfirmOpen,
    setBulkDeleteConfirmOpen,
    isBulkDeleting,
    handleBulkDelete
  };
}
