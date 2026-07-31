"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { supabase } from "@/lib/supabase";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/i18n/currency";

import {
  useDataTable,
  DataTable,
  DataTableSearch,
  DataTablePagination,
  DataTableColumnHeader,
  DataTableFacetedFilter,
  DataTableViewOptions,
  multiSelectFilterFn,
  textCol,
  numCol,
  dateCol,
  DataGrid,
  DataGridToolbar,
  DataGridSearch,
  DataGridTable,
  DataGridPagination,
  DataGridViewOptions
} from "@/components/data-table";
import { APP_BASE_CURRENCY } from "@/config/billing-rates";

interface SuperadminSubscription {
  id: string;
  tenant_id: string;
  status: string;
  ends_at: string | null;
  cancel_at_period_end: boolean;
  tenants: {
    name: string;
  } | null;
  plans: {
    name: string;
    price: number;
  } | null;
}

const containsFilterFn = (row: any, columnId: string, filterValue: string) => {
  if (!filterValue) return true;
  return String(row.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase());
};

export function SuperadminSubscriptionsPage() {
  const locale = useLocale();
  const t = useTranslations("superadmin.billing.subscriptions");
  const ttable = useTranslations("data-table");

  const [subscriptions, setSubscriptions] = useState<SuperadminSubscription[]>([]);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const renewalOptions = [
    { value: "on", label: t("table.auto-renew") },
    { value: "off", label: t("table.renew-off") }
  ];

  const formatPrice = (amount: number, currency?: string) =>
    formatCurrency(amount, locale, { currencyCode: currency ?? APP_BASE_CURRENCY });

  const loadSubscriptionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const plansRes = await fetch("/api/billing/plans").then((r) => r.json());
      const currentPlans = plansRes?.plans || [];
      setDbPlans(currentPlans);

      const { data, error } = await (await subscriptionRepository(supabase)).query().select(`
        id,
        tenant_id,
        status,
        ends_at,
        cancel_at_period_end,
        plan_id,
        tenants (
          name
        )
      `);

      if (error) throw error;

      if (data) {
        const mappedSubs: SuperadminSubscription[] = (data as any[]).map((sub) => {
          const planConfig = currentPlans.find((p: any) => p.id === sub.plan_id);
          const price = planConfig ? (planConfig.prices?.monthly?.amount ?? 0) : 0;

          let localizedName = "Free";
          if (planConfig) {
            const rawName = planConfig.name;
            if (rawName && typeof rawName === "object") {
              localizedName =
                rawName[locale] || rawName["en"] || Object.values(rawName)[0] || "Free";
            } else if (rawName) {
              localizedName = String(rawName);
            }
          } else if (sub.plan_id) {
            localizedName = sub.plan_id;
          }

          return {
            id: sub.id,
            tenant_id: sub.tenant_id,
            status: sub.status,
            ends_at: sub.ends_at,
            cancel_at_period_end: sub.cancel_at_period_end,
            tenants: sub.tenants,
            plans: {
              name: localizedName,
              price: price
            }
          };
        });

        setSubscriptions(mappedSubs.filter((sub) => sub.status === "active"));
      }
    } catch (e) {
      console.error("Gagal memuat data langganan:", e);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const planOptions = useMemo(() => {
    const unique = Array.from(
      new Set(subscriptions.map((sub) => sub.plans?.name).filter(Boolean) as string[])
    );
    return unique.map((name) => ({ value: name, label: name }));
  }, [subscriptions]);

  const columns: ColumnDef<SuperadminSubscription>[] = [
    textCol<SuperadminSubscription>({
      key: "tenants_name",
      header: t("table.tenant"),
      cell: (row) => {
        const sub = row;
        return (
          <div className="flex items-center gap-2">
            <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className="text-foreground font-semibold">
              {sub.tenants?.name || "Unknown Tenant"}
            </span>
          </div>
        );
      }
    }),
    textCol<SuperadminSubscription>({
      key: "plans_name",
      header: t("table.plan"),
      cell: (row) => {
        const sub = row;
        return (
          <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
            {sub.plans?.name || "Free"} {t("table.plan")}
          </Badge>
        );
      }
    }),
    numCol<SuperadminSubscription>({
      key: "plans_price",
      header: t("table.price"),
      cell: (row) => {
        const sub = row;
        return (
          <div className="flex items-baseline gap-0.5">
            <span className="text-foreground font-bold">{formatPrice(sub.plans?.price || 0)}</span>
          </div>
        );
      }
    }),
    dateCol<SuperadminSubscription>({
      key: "ends_at",
      header: t("table.expiry"),
      cell: (row) => {
        const sub = row;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">
              {sub.ends_at
                ? new Date(sub.ends_at).toLocaleDateString(locale === "id" ? "id-ID" : "en-US")
                : t("placeholders.unlimited") || "Unlimited"}
            </span>
            {sub.cancel_at_period_end && (
              <span className="text-[10px] font-medium text-red-500">
                {t("placeholders.renewOff") || "Renewal Off"}
              </span>
            )}
          </div>
        );
      }
    }),
    textCol<SuperadminSubscription>({
      key: "renewalStatus",
      header: t("table.renewal"),
      cell: (row) => (row.cancel_at_period_end ? t("table.renew-off") : t("table.auto-renew"))
    }),
    textCol<SuperadminSubscription>({
      key: "status",
      header: t("table.status"),
      cell: (row) => {
        const sub = row;
        return (
          <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-600 uppercase hover:bg-emerald-500/10">
            {t.has(`table.statuses.${sub.status}`) ? t(`table.statuses.${sub.status}`) : sub.status}
          </Badge>
        );
      }
    })
  ];

  const table = useDataTable({
    columns,
    data: subscriptions,
    initialColumnVisibility: { renewalStatus: false }
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-3">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <div className="space-y-4">
        <div className="flex flex-row flex-wrap items-center gap-2">
          <DataGrid table={table} columns={columns}>
            <DataGridToolbar>
              <DataGridSearch columnId="tenants_name" placeholder={t("table.search")} />
              <DataTableFacetedFilter
                column={table.getColumn("plans_name")}
                title={t("table.plan") || "Plan"}
                options={planOptions}
              />

              <DataTableFacetedFilter
                column={table.getColumn("renewalStatus")}
                title={t("table.renewal")}
                options={renewalOptions}
              />

              <DataGridViewOptions className="md:ms-auto" label={t("filters.columns")} />
            </DataGridToolbar>
            <DataGridTable />
            <DataGridPagination
              pageSizeOptions={[10, 20, 50, 100]}
              rowsPerPageLabel={t("table.rowsPerPage")}
              selectedLabel={(selected, total) => `${selected} / ${total} ${t("selected")}`}
            />
          </DataGrid>
        </div>
      </div>
    </div>
  );
}
