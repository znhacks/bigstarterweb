// app/(auth)/(superadmin)/superadmin/billing/subscriptions/view.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Impor klien Supabase, Global Language Hook
import { supabase } from "@/lib/supabase";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/i18n/currency";

// Reusable Table Components
import {
  useDataTable,
  DataTable,
  DataTableSearch,
  DataTablePagination,
  DataTableColumnHeader,
  DataTableFacetedFilter,
  DataTableViewOptions,
  multiSelectFilterFn
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

      const { data, error } = await (await subscriptionRepository(supabase))
        .query()
        .select(`
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

          // Mengatasi masalah lokalisasi nama plan
          let localizedName = "Free";
          if (planConfig) {
            const rawName = planConfig.name;
            if (rawName && typeof rawName === "object") {
              // Mencari lokalisasi yang sesuai, dengan fallback ke bahasa Inggris atau value pertama
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

  const columns = useMemo<ColumnDef<SuperadminSubscription, unknown>[]>(
    () => [
      {
        accessorKey: "tenants.name",
        id: "tenants_name",
        meta: {
          label: t("table.tenant")
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.tenant") || "Tenant"} />
        ),
        filterFn: containsFilterFn,
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <div className="flex items-center gap-2">
              <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="text-foreground font-semibold">
                {sub.tenants?.name || "Unknown Tenant"}
              </span>
            </div>
          );
        }
      },
      {
        accessorKey: "plans.name",
        id: "plans_name",
        meta: {
          label: t("table.plan")
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.plan") || "Plan"} />
        ),
        filterFn: multiSelectFilterFn,
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
              {sub.plans?.name || "Free"} {t("table.plan")}
            </Badge>
          );
        }
      },
      {
        accessorKey: "plans.price",
        id: "plans_price",
        meta: {
          label: t("table.price")
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.price") || "Price"} />
        ),
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <div className="flex items-baseline gap-0.5">
              <span className="text-foreground font-bold">
                {formatPrice(sub.plans?.price || 0)}
              </span>
            </div>
          );
        }
      },
      {
        accessorKey: "ends_at",
        meta: {
          label: t("table.expiry")
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.expiry") || "Expiry / Renewal"} />
        ),
        cell: ({ row }) => {
          const sub = row.original;
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
      },
      {
        id: "renewalStatus",
        meta: {
          label: t("table.renewal")
        },
        accessorFn: (row) => (row.cancel_at_period_end ? "off" : "on"),
        header: t("table.renewal"),
        filterFn: multiSelectFilterFn,
        cell: ({ row }) =>
          row.original.cancel_at_period_end ? t("table.renew-off") : t("table.auto-renew")
      },
      {
        accessorKey: "status",
        meta: {
          label: t("table.status")
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status") || "Status"} />
        ),
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-600 uppercase hover:bg-emerald-500/10">
              {t.has(`table.statuses.${sub.status}`)
                ? t(`table.statuses.${sub.status}`)
                : sub.status}
            </Badge>
          );
        }
      }
    ],
    [locale, t]
  );

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
    <div className="mx-auto w-full space-y-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-row flex-wrap items-center gap-2">
          <DataTableSearch
            table={table}
            columnId="tenants_name"
            placeholder={t("table.search") || "Cari tenant..."}
          />

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

          <DataTableViewOptions table={table} className="md:ms-auto" label={t("filters.columns")} />
        </div>

        <DataTable
          table={table}
          columns={columns}
          noResultsText={t("placeholders.noSubscriptions") || "No active subscriptions found."}
        />

        <DataTablePagination
          table={table}
          selectedLabel={(selected, total) =>
            ttable("pagination.selecteddata", {
              selected,
              total
            })
          }
          rowsPerPageLabel={ttable("pagination.rowsPerPage")}
          previousLabel={ttable("pagination.previous")}
          nextLabel={ttable("pagination.next")}
        />
      </div>
    </div>
  );
}
