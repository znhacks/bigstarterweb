"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Impor klien Supabase, Global Language Hook
import { supabase } from "@/lib/supabase";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/i18n/currency";

// Reusable Table Components
import { useDataTable } from "@/components/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

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

export function SuperadminSubscriptionsPage() {
  const locale = useLocale();
  const t = useTranslations("superadmin.billing");

  const [subscriptions, setSubscriptions] = useState<SuperadminSubscription[]>([]);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatPrice = (amount: number, currency?: string) =>
    formatCurrency(amount, locale, { currencyCode: currency ?? "IDR" });

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      // Dapatkan data plans terlebih dahulu agar mapping id plan akurat
      const plansRes = await fetch("/api/billing/plans").then((r) => r.json());
      const currentPlans = plansRes?.plans || [];
      setDbPlans(currentPlans);

      const { data, error } = await supabase.from("subscriptions").select(`
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

          return {
            id: sub.id,
            tenant_id: sub.tenant_id,
            status: sub.status,
            ends_at: sub.ends_at,
            cancel_at_period_end: sub.cancel_at_period_end,
            tenants: sub.tenants,
            plans: {
              name: planConfig ? planConfig.name : sub.plan_id || "Free",
              price: price
            }
          };
        });

        // Tampilkan langganan dengan status "active"
        setSubscriptions(mappedSubs.filter((sub) => sub.status === "active"));
      }
    } catch (e) {
      console.error("Gagal memuat data langganan:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<SuperadminSubscription, unknown>[]>(
    () => [
      {
        accessorKey: "tenants.name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.tenant") || "Tenant"} />
        ),
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.plan") || "Plan"} />
        ),
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
              {sub.plans?.name || "Free"} Plan
            </Badge>
          );
        }
      },
      {
        accessorKey: "plans.price",
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
              <span className="text-muted-foreground text-xs">/mo</span>
            </div>
          );
        }
      },
      {
        accessorKey: "ends_at",
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
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status") || "Status"} />
        ),
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-600 uppercase hover:bg-emerald-500/10">
              {sub.status}
            </Badge>
          );
        }
      }
    ],
    [locale, t]
  );

  const table = useDataTable({
    columns,
    data: subscriptions
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
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Daftar Langganan Aktif
        </h1>
        <p className="text-muted-foreground text-sm">
          Menampilkan daftar penyewa (tenant) yang saat ini memiliki paket berlangganan aktif.
        </p>
      </div>

      <div className="border-border/80 bg-card rounded-2xl border p-6 shadow-sm">
        <DataTable
          table={table}
          columns={columns}
          noResultsText={t("placeholders.noSubscriptions") || "No active subscriptions found."}
        />
      </div>
    </div>
  );
}
