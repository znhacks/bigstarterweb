"use client";

import * as React from "react";
import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Loader2,
  DollarSign,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from "recharts";

import { useTranslations } from "next-intl";
import { formatCurrency, formatTransactionAmount } from "@/lib/i18n/currency";
import { useSuperadminBilling } from "./logic";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import type { DateRange } from "react-day-picker";

import {
  useDataGrid,
  DataGrid,
  DataGridContent,
  DataGridTable,
  textCol,
  actionCol,
  numCol
} from "@/components/data-table";
import { APP_BASE_CURRENCY } from "@/config/billing-rates";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"];

interface BillingDashboardViewProps {
  locale: string;
  isLoading: boolean;
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  revenueChartInterval: "day" | "month" | "year";
  setRevenueChartInterval: (val: "day" | "month" | "year") => void;
  plans: any[];
  filteredData: { txs: any[]; subs: any[] };
  metrics: {
    totalRev: number;
    mrr: number;
    activeSubsCount: number;
    canceledSubsCount: number;
    failedPaymentsCount: number;
  };
  revenueChartData: any[];
  subscriptionAnalyticsData: any[];
  paymentAnalyticsData: { name: string; value: number }[];
  revenueByPlanData: any[];
  subscriptionStatusData: { name: string; value: number }[];
  topCustomers: any[];
  topPlans: any[];
  loadAllDashboardData: () => void;
}

export function SuperadminBillingDashboard() {
  const billingState = useSuperadminBilling();
  return <SuperadminBillingDashboardView {...billingState} />;
}

function SuperadminBillingDashboardView({
  locale,
  isLoading,
  date,
  setDate,
  revenueChartInterval,
  setRevenueChartInterval,
  filteredData,
  metrics,
  revenueChartData,
  subscriptionAnalyticsData,
  paymentAnalyticsData,
  revenueByPlanData,
  subscriptionStatusData,
  topCustomers,
  topPlans,
  loadAllDashboardData
}: BillingDashboardViewProps) {
  const t = useTranslations("superadmin.billing");
  const ttable = useTranslations("data-table");

  const formatPrice = (amount: number, currency?: string) =>
    formatCurrency(amount, locale, { currencyCode: currency ?? APP_BASE_CURRENCY });

  const transactionColumns = useMemo<ColumnDef<any, unknown>[]>(
    () => [
      textCol<any>({
        key: "tenants_name",
        header: "User",
        cell: (tx) => (
          <span className="text-foreground font-semibold">
            {tx.tenants?.name || "Unknown Tenant"}
          </span>
        )
      }),
      textCol<any>({
        key: "plan_name",
        header: "Plan",
        cell: (tx) => tx.plan_name
      }),
      textCol<any>({
        key: "amount",
        header: "Amount",
        cell: (tx) => (
          <span
            className={
              tx.status === "failed" ? "font-bold text-red-600" : "text-foreground font-bold"
            }>
            {formatTransactionAmount(tx.amount, tx.currency, tx.amount_in_idr, locale)}
          </span>
        )
      }),
      textCol<any>({
        key: "provider",
        header: "Gateway",
        cell: (tx) => <span className="font-mono text-xs uppercase">{tx.provider || "-"}</span>
      }),
      textCol<any>({
        key: "status",
        header: "Status",
        cell: (tx) => {
          const status = tx.status?.toLowerCase();
          return (
            <Badge
              variant="outline"
              className={`rounded-full text-[10px] font-bold uppercase ${
                ["paid", "completed"].includes(status)
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                  : status === "failed"
                    ? "border-red-500/20 bg-red-500/10 text-red-600"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-600"
              }`}>
              {tx.status}
            </Badge>
          );
        }
      }),
      actionCol<any>({
        header: "Action",
        enableSorting: false,
        cell: () => (
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="Lihat Invoice">
            <FileText className="h-4 w-4" />
          </Button>
        )
      })
    ],
    [locale]
  );

  const subscriptionColumns = useMemo<ColumnDef<any, unknown>[]>(
    () => [
      textCol<any>({
        key: "tenants_name",
        header: "User",
        cell: (sub) => (
          <span className="text-foreground font-semibold">
            {sub.tenants?.name || "Unknown Tenant"}
          </span>
        )
      }),
      textCol<any>({
        key: "plan_id",
        header: "Plan",
        cell: (sub) => <span className="capitalize">{sub.plan_id || "Free"}</span>
      }),
      textCol<any>({
        key: "type",
        header: "Type",
        cell: (sub) => {
          return sub.cancel_at_period_end ? (
            <span className="font-medium text-red-500">Cancel</span>
          ) : sub.interval === "year" ? (
            <span className="font-medium text-purple-600">Yearly Renewal</span>
          ) : (
            <span className="font-medium text-emerald-600">New / Monthly</span>
          );
        }
      }),
      textCol<any>({
        key: "status",
        header: "Status",
        cell: (sub) => (
          <Badge
            className={`rounded-full text-[10px] font-bold uppercase ${
              sub.status === "active"
                ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                : "border border-amber-500/20 bg-amber-500/10 text-amber-600"
            }`}>
            {sub.status}
          </Badge>
        )
      }),
      textCol<any>({
        key: "starts_at",
        header: "Date",
        cell: (sub) => {
          return new Date(sub.starts_at).toLocaleDateString(locale === "id" ? "id-ID" : "en-US");
        }
      })
    ],
    [locale]
  );

  const txTable = useDataGrid({
    columns: transactionColumns,
    data: useMemo(() => filteredData.txs.slice(0, 10), [filteredData.txs])
  });

  const subTable = useDataGrid({
    columns: subscriptionColumns,
    data: useMemo(() => filteredData.subs.slice(0, 10), [filteredData.subs])
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-3">
      <div className="flex flex-col gap-4 border-b border-dashed pb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Dashboard Billing</h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CalendarDateRangePicker date={date} setDate={setDate} className="w-full sm:w-[260px]" />
          <Button
            onClick={loadAllDashboardData}
            variant="outline"
            className="h-9 items-center gap-2 text-xs font-semibold">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="">
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Total Revenue
              </span>
              <h4 className="text-foreground text-xl font-bold tracking-tight">
                {formatPrice(metrics.totalRev)}
              </h4>
            </div>
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <DollarSign className="text-primary h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                MRR (Monthly)
              </span>
              <h4 className="text-foreground text-xl font-bold tracking-tight">
                {formatPrice(metrics.mrr)}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Active Subs
              </span>
              <h4 className="text-foreground text-xl font-bold tracking-tight">
                {metrics.activeSubsCount}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Canceled Subs
              </span>
              <h4 className="text-foreground text-xl font-bold tracking-tight">
                {metrics.canceledSubsCount}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Failed Payments
              </span>
              <h4 className="text-foreground text-xl font-bold tracking-tight">
                {metrics.failedPaymentsCount}
              </h4>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="">
        <CardHeader className="flex flex-col items-start justify-between gap-4 border-b border-dashed pb-4 md:flex-row md:items-center">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold">Revenue Analytics</CardTitle>
          </div>
          <div className="bg-muted/20 flex rounded-lg border p-1">
            <button
              onClick={() => setRevenueChartInterval("day")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                revenueChartInterval === "day"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              Harian
            </button>
            <button
              onClick={() => setRevenueChartInterval("month")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                revenueChartInterval === "month"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              Bulanan
            </button>
            <button
              onClick={() => setRevenueChartInterval("year")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                revenueChartInterval === "year"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              Tahunan
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-87.5 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `Rp${(val / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(value: any) => [formatPrice(value), "Pendapatan"]}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Pendapatan"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">Subscription Activity Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-70 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subscriptionAnalyticsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)"
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Baru" name="Baru" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="Pembatalan"
                    name="Pembatalan"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader>
            <CardTitle className="text-base font-bold">Payment Gateway</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-55 w-full">
              {paymentAnalyticsData.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                  Tidak ada data gateway
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentAnalyticsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value">
                      {paymentAnalyticsData.map(
                        (entry: { name: string; value: number }, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        )
                      )}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
              {paymentAnalyticsData.map((entry: { name: string; value: number }, index: number) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-foreground font-medium uppercase">{entry.name}</span>
                  <span className="text-muted-foreground">({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="">
          <CardHeader>
            <CardTitle className="text-base font-bold">Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-65 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByPlanData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    type="number"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)"
                    }}
                  />
                  <Bar
                    dataKey="Pengguna"
                    name="Total Pengguna"
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader>
            <CardTitle className="text-base font-bold">Subscription Status Dist.</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-55 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptionStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value">
                    {subscriptionStatusData.map(
                      (entry: { name: string; value: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      )
                    )}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
              {subscriptionStatusData.map(
                (entry: { name: string; value: number }, index: number) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-foreground font-medium uppercase">{entry.name}</span>
                    <span className="text-muted-foreground">({entry.value})</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataGrid
              table={txTable}
              columns={transactionColumns}
              noResultsText="No transactions found.">
              <DataGridContent>
                <DataGridTable />
              </DataGridContent>
            </DataGrid>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataGrid
              table={subTable}
              columns={subscriptionColumns}
              noResultsText="No subscriptions found.">
              <DataGridContent>
                <DataGridTable />
              </DataGridContent>
            </DataGrid>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
