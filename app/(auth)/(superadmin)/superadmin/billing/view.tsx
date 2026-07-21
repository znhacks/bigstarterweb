"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2, DollarSign, CreditCard, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Impor klien Supabase, Global Language Hook
import { supabase } from "@/lib/supabase";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatTransactionAmount } from "@/lib/i18n/currency";

// Reusable Table Components
import { useDataTable } from "@/components/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { APP_BASE_CURRENCY } from "@/config/billing-rates";

interface SuperadminTransaction {
  id: string;
  amount: number;
  currency: string | null;
  amount_in_idr: number | null;
  plan_name: string;
  order_id: string;
  status: string;
  created_at: string;
  tenants: {
    name: string;
  } | null;
}

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

export function SuperadminBillingDashboard() {
  const locale = useLocale();
  const t = useTranslations("superadmin.billing");

  // Formatter harga lokal — default IDR (base currency aplikasi).
  const formatPrice = (amount: number, currency?: string) =>
    formatCurrency(amount, locale, { currencyCode: currency ?? APP_BASE_CURRENCY });

  // State Data Global dari Supabase
  const [transactions, setTransactions] = useState<SuperadminTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<SuperadminSubscription[]>([]);
  const [dbPlans, setDbPlans] = useState<any[]>([]);

  // State KPI Metrics
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeSubsCount, setActiveSubsCount] = useState(0);

  // State Loading
  const [isLoading, setIsLoading] = useState(true);

  const fetchDbPlans = async () => {
    try {
      const res = await fetch("/api/billing/plans").then((r) => r.json());
      setDbPlans(res?.plans || []);
    } catch (e) {
      console.error("Gagal memuat daftar plan:", e);
    }
  };

  useEffect(() => {
    loadSuperadminData();
  }, []);

  const loadSuperadminData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchTransactions(), fetchSubscriptions(), fetchDbPlans()]);
    } catch (e: any) {
      console.error("Gagal memuat data superadmin:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Ambil data transaksi global
  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        id,
        amount,
        currency,
        amount_in_idr,
        plan_name,
        order_id,
        status,
        created_at,
        tenants (
          name
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (data) {
      const txs = data as unknown as SuperadminTransaction[];
      setTransactions(txs);

      const PAID = ["paid", "completed"];
      const total = txs
        .filter((tx) => PAID.includes(tx.status?.toLowerCase()) && tx.amount_in_idr != null)
        .reduce((sum, tx) => sum + (tx.amount_in_idr ?? 0), 0);
      setTotalRevenue(total);
    }
  };

  // 2. Ambil seluruh data langganan
  const fetchSubscriptions = async () => {
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
        const planConfig = dbPlans.find((p) => p.id === sub.plan_id);
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

      const activeSubs = mappedSubs.filter((sub) => sub.status === "active");
      setSubscriptions(activeSubs);
      setActiveSubsCount(activeSubs.length);
    }
  };

  // Definisi Kolom untuk Tabel Langganan (Subscriptions)
  const subscriptionColumns = useMemo<ColumnDef<SuperadminSubscription, unknown>[]>(
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

  // Definisi Kolom untuk Tabel Transaksi (Transactions)
  const transactionColumns = useMemo<ColumnDef<SuperadminTransaction, unknown>[]>(
    () => [
      {
        accessorKey: "tenants.name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.tenant") || "Tenant"} />
        ),
        cell: ({ row }) => {
          const tx = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground font-semibold">
                {tx.tenants?.name || "Unknown Tenant"}
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">{tx.order_id}</span>
            </div>
          );
        }
      },
      {
        accessorKey: "plan_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.plan") || "Plan"} />
        ),
        cell: ({ row }) => row.original.plan_name
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.date") || "Date"} />
        ),
        cell: ({ row }) => {
          return new Date(row.original.created_at).toLocaleDateString(
            locale === "id" ? "id-ID" : "en-US"
          );
        }
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.amount") || "Amount"} />
        ),
        cell: ({ row }) => {
          const tx = row.original;
          const isRefunded = tx.status === "refunded";
          return (
            <span className={`font-bold ${isRefunded ? "text-red-600" : "text-foreground"}`}>
              {isRefunded ? "-" : ""}
              {formatTransactionAmount(tx.amount, tx.currency, tx.amount_in_idr, locale)}
            </span>
          );
        }
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status") || "Status"} />
        ),
        cell: ({ row }) => {
          const tx = row.original;
          const isRefunded = tx.status === "refunded";
          return (
            <Badge
              className={`rounded-full text-[9px] font-bold uppercase ${
                isRefunded
                  ? "border border-red-500/20 bg-red-500/10 text-red-600"
                  : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
              }`}>
              {tx.status}
            </Badge>
          );
        }
      }
    ],
    [locale, t]
  );

  // Inisialisasi React Table Hooks
  const subscriptionTable = useDataTable({
    columns: subscriptionColumns,
    data: subscriptions
  });

  const transactionTable = useDataTable({
    columns: transactionColumns,
    data: transactions
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-8 px-4 py-10">
      {/* Header Dashboard */}
      <div className="space-y-1">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subTitle")}</p>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card 1: Total Revenue */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("kpis.revenue")}
              </span>
              <h3 className="text-foreground text-3xl font-bold tracking-tight">
                {formatPrice(totalRevenue)}
              </h3>
            </div>
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
              <DollarSign className="text-primary h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Active Subscriptions */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("kpis.active")}
              </span>
              <h3 className="text-foreground text-3xl font-bold tracking-tight">
                {activeSubsCount}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <CreditCard className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABS MANAGEMENT */}
      <Tabs defaultValue="subscriptions" className="w-full space-y-6">
        <TabsList className="border-border/60 h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="subscriptions"
            className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-semibold shadow-none transition-all data-[state=active]:bg-transparent">
            {t("tabs.subscriptions")} ({subscriptions.length})
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-semibold shadow-none transition-all data-[state=active]:bg-transparent">
            {t("tabs.history")} ({transactions.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB CONTENT 1: SUBSCRIPTIONS (TABLE FORMAT) */}
        <TabsContent value="subscriptions" className="mt-0 focus-visible:outline-none">
          <div className="space-y-3">
            <DataTable
              table={subscriptionTable}
              columns={subscriptionColumns}
              noResultsText={t("placeholders.noSubscriptions") || "No active subscriptions found."}
            />
          </div>
        </TabsContent>

        {/* TAB CONTENT 2: TRANSACTION HISTORY (TABLE FORMAT) */}
        <TabsContent value="transactions" className="mt-0 focus-visible:outline-none">
          <div className="space-y-3">
            <DataTable
              table={transactionTable}
              columns={transactionColumns}
              noResultsText={t("placeholders.noTransactions")}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
