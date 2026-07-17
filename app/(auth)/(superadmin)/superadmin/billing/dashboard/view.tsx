"use client";

import * as React from "react";
import {
  Loader2,
  DollarSign,
  CreditCard,
  Calendar,
  Filter,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Tag,
  Users,
  Undo2,
  RefreshCw,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"];

interface BillingDashboardViewProps {
  locale: string;
  isLoading: boolean;
  dateRange: string;
  setDateRange: (val: string) => void;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
  gatewayFilter: string;
  setGatewayFilter: (val: string) => void;
  currencyFilter: string;
  setCurrencyFilter: (val: string) => void;
  planFilter: string;
  setPlanFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  uniqueGateways: string[];
  uniqueCurrencies: string[];
  revenueChartInterval: "day" | "month" | "year";
  setRevenueChartInterval: (val: "day" | "month" | "year") => void;
  plans: any[];
  filteredData: { txs: any[]; subs: any[] };
  metrics: {
    totalRev: number;
    mrr: number;
    arr: number;
    activeSubsCount: number;
    expiredSubsCount: number;
    canceledSubsCount: number;
    failedPaymentsCount: number;
    couponsUsedCount: number;
    arpu: number;
    refundCount: number;
    refundAmount: number;
    refundRate: number;
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

// Komponen Pembungkus Utama (Connected Component)
export function SuperadminBillingDashboard() {
  const billingState = useSuperadminBilling();
  return <SuperadminBillingDashboardView {...billingState} />;
}

// Komponen Presentational Internal
function SuperadminBillingDashboardView({
  locale,
  isLoading,
  dateRange,
  setDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  gatewayFilter,
  setGatewayFilter,
  currencyFilter,
  setCurrencyFilter,
  planFilter,
  setPlanFilter,
  statusFilter,
  setStatusFilter,
  uniqueGateways,
  uniqueCurrencies,
  revenueChartInterval,
  setRevenueChartInterval,
  plans,
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

  const formatPrice = (amount: number, currency?: string) =>
    formatCurrency(amount, locale, { currencyCode: currency ?? "IDR" });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-8 px-4 py-8">
      {/* HEADER & RESET PANEL */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            Dashboard Billing Analitik
          </h1>
          <p className="text-muted-foreground text-sm">
            Dashboard visualisasi metrik, pendapatan, dan kesehatan langganan.
          </p>
        </div>
        <Button
          onClick={loadAllDashboardData}
          variant="outline"
          className="inline-flex h-10 items-center gap-2 self-start rounded-xl text-xs font-semibold">
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {/* FILTER PANEL */}
      <Card className="border-border/80 rounded-2xl border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="text-primary h-5 w-5" />
            <CardTitle className="text-base font-semibold">Filter Analitik Terintegrasi</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
          {/* Rentang Waktu */}
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Rentang Waktu</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border-border/80 text-foreground focus:ring-primary w-full rounded-xl border bg-transparent p-2.5 text-sm focus:ring-1 focus:outline-none">
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
              <option value="this_month">Bulan Ini</option>
              <option value="this_year">Tahun Ini</option>
              <option value="custom">Pilih Tanggal</option>
            </select>
          </div>

          {/* Payment Gateway */}
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Payment Gateway</label>
            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              className="border-border/80 text-foreground focus:ring-primary text-capitalize w-full rounded-xl border bg-transparent p-2.5 text-sm focus:ring-1 focus:outline-none">
              <option value="all">Semua Gateway</option>
              {uniqueGateways.map((g: string) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Mata Uang */}
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Mata Uang</label>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="border-border/80 text-foreground focus:ring-primary w-full rounded-xl border bg-transparent p-2.5 text-sm focus:ring-1 focus:outline-none">
              <option value="all">Semua Currency</option>
              {uniqueCurrencies.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Subscription Plan */}
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Paket Langganan</label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="border-border/80 text-foreground focus:ring-primary w-full rounded-xl border bg-transparent p-2.5 text-sm focus:ring-1 focus:outline-none">
              <option value="all">Semua Plan</option>
              {plans.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Pembayaran */}
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">Status Pembayaran</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-border/80 text-foreground focus:ring-primary w-full rounded-xl border bg-transparent p-2.5 text-sm focus:ring-1 focus:outline-none">
              <option value="all">Semua Status</option>
              <option value="paid">Paid / Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {dateRange === "custom" && (
            <div className="col-span-1 grid grid-cols-2 gap-4 border-t border-dashed pt-2 sm:col-span-2 md:col-span-5">
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">Tanggal Mulai</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">Tanggal Akhir</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI METRIC CARDS ROW 1 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Total Revenue
              </span>
              <h3 className="text-foreground text-2xl font-bold tracking-tight">
                {formatPrice(metrics.totalRev)}
              </h3>
            </div>
            <div className="bg-primary/10 flex h-11 w-11 items-center justify-center rounded-xl">
              <DollarSign className="text-primary h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* MRR */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Monthly Revenue (MRR)
              </span>
              <h3 className="text-foreground text-2xl font-bold tracking-tight">
                {formatPrice(metrics.mrr)}
              </h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* ARR */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Annual Revenue (ARR)
              </span>
              <h3 className="text-foreground text-2xl font-bold tracking-tight">
                {formatPrice(metrics.arr)}
              </h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Active Subscriptions
              </span>
              <h3 className="text-foreground text-2xl font-bold tracking-tight">
                {metrics.activeSubsCount}
              </h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI METRIC CARDS ROW 2 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Expired Subscriptions */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Expired Subscriptions
              </span>
              <h3 className="text-foreground text-xl font-bold tracking-tight">
                {metrics.expiredSubsCount}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        {/* Canceled Subscriptions */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Canceled Subscriptions
              </span>
              <h3 className="text-foreground text-xl font-bold tracking-tight">
                {metrics.canceledSubsCount}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        {/* Failed Payments */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Failed Payments
              </span>
              <h3 className="text-foreground text-xl font-bold tracking-tight">
                {metrics.failedPaymentsCount}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI METRIC CARDS ROW 3 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Coupons Used */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Coupons Used
              </span>
              <h3 className="text-foreground text-xl font-bold tracking-tight">
                {metrics.couponsUsedCount}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
              <Tag className="h-5 w-5 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        {/* ARPU */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                ARPU (Average Revenue Per User)
              </span>
              <h3 className="text-foreground text-xl font-bold tracking-tight">
                {formatPrice(metrics.arpu)}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10">
              <Users className="h-5 w-5 text-teal-600" />
            </div>
          </CardContent>
        </Card>

        {/* Refund Statistics - Count */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Refund Count
              </span>
              <h3 className="text-foreground text-xl font-bold tracking-tight">
                {metrics.refundCount}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
              <Undo2 className="h-5 w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>

        {/* Refund Statistics - Rate */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Refund Rate / Total
              </span>
              <h3 className="text-foreground text-xl font-bold tracking-tight">
                {metrics.refundRate.toFixed(1)}%{" "}
                <span className="text-muted-foreground text-xs">
                  ({formatPrice(metrics.refundAmount)})
                </span>
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
              <Undo2 className="h-5 w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CHART 1: REVENUE ANALYTICS */}
      <Card className="border-border/80 rounded-2xl border shadow-sm">
        <CardHeader className="flex flex-col items-start justify-between gap-4 border-b border-dashed pb-4 md:flex-row md:items-center">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold">Revenue Analytics</CardTitle>
            <CardDescription>
              Grafik tren perkembangan total omset real-time berdasarkan transaksi sukses.
            </CardDescription>
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

      {/* GRAPH ROW 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Subscription Analytics */}
        <Card className="border-border/80 col-span-1 rounded-2xl border shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">Subscription Activity Analytics</CardTitle>
            <CardDescription>
              Visualisasi aktivitas pendaftaran, perpanjangan, dan pembatalan baru.
            </CardDescription>
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

        {/* Payment Gateway */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Payment Gateway</CardTitle>
            <CardDescription>
              Rasio penggunaan platform integrasi gateway oleh pelanggan.
            </CardDescription>
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

      {/* GRAPH ROW 3 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue by Plan */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Revenue by Plan</CardTitle>
            <CardDescription>
              Distribusi jumlah pengguna aktif pada masing-masing plan langganan.
            </CardDescription>
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

        {/* Subscription Status Pie */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Subscription Status Dist.</CardTitle>
            <CardDescription>
              Status siklus hidup pelanggan aktif, trial, past due, maupun ditangguhkan.
            </CardDescription>
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

      {/* DETAILED DATA TABLES PANEL */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Transactions Table */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Transactions (Last 10)</CardTitle>
            <CardDescription>
              Daftar invoice dan aktivitas pembayaran masuk terakhir.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground border-y border-dashed text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Gateway</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed">
                  {filteredData.txs.slice(0, 10).map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3.5 font-medium">
                        {tx.tenants?.name || "Unknown Tenant"}
                      </td>
                      <td className="px-4 py-3.5">{tx.plan_name}</td>
                      <td className="px-4 py-3.5 font-bold">
                        {formatTransactionAmount(tx.amount, tx.currency, tx.amount_in_idr, locale)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs uppercase">{tx.provider}</td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={`rounded-full text-[10px] font-bold ${
                            ["paid", "completed"].includes(tx.status?.toLowerCase())
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                              : tx.status === "failed"
                                ? "border-red-500/20 bg-red-500/10 text-red-600"
                                : "border-amber-500/20 bg-amber-500/10 text-amber-600"
                          }`}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg"
                          title="Lihat Invoice">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Subscriptions Table */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Subscriptions</CardTitle>
            <CardDescription>
              Daftar pendaftaran dan pembaruan siklus status langganan.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground border-y border-dashed text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed">
                  {filteredData.subs.slice(0, 10).map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3.5 font-medium">
                        {sub.tenants?.name || "Unknown Tenant"}
                      </td>
                      <td className="px-4 py-3.5">{sub.plan_id || "Free"}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {sub.cancel_at_period_end ? (
                          <span className="font-medium text-red-500">Cancel</span>
                        ) : sub.interval === "year" ? (
                          <span className="font-medium text-purple-600">Yearly Renewal</span>
                        ) : (
                          <span className="font-medium text-emerald-600">New / Monthly</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          className={`rounded-full text-[10px] font-bold ${
                            sub.status === "active"
                              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                              : "border border-amber-500/20 bg-amber-500/10 text-amber-600"
                          }`}>
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground px-4 py-3.5 text-xs font-medium">
                        {new Date(sub.starts_at).toLocaleDateString(
                          locale === "id" ? "id-ID" : "en-US"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ADDITIONAL SEGMENTS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Failed Payments */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Failed Payments</CardTitle>
            <CardDescription>Transaksi bermasalah yang memerlukan tindak lanjut.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 text-muted-foreground border-y">
                  <tr>
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Gateway</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed">
                  {filteredData.txs
                    .filter((tx: any) => tx.status === "failed")
                    .slice(0, 5)
                    .map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-muted/10">
                        <td className="px-3 py-2.5 font-medium">{tx.tenants?.name || "Unknown"}</td>
                        <td className="px-3 py-2.5 font-mono uppercase">{tx.provider || "-"}</td>
                        <td className="px-3 py-2.5 font-semibold text-red-600">
                          {formatTransactionAmount(
                            tx.amount,
                            tx.currency,
                            tx.amount_in_idr,
                            locale
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Top Customers</CardTitle>
            <CardDescription>Penyewa kontributor nilai pendapatan terbesar.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 text-muted-foreground border-y">
                  <tr>
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Total Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed">
                  {topCustomers.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/10">
                      <td className="px-3 py-2.5 font-medium">{c.name}</td>
                      <td className="text-muted-foreground px-3 py-2.5 uppercase">{c.plan}</td>
                      <td className="px-3 py-2.5 font-bold text-emerald-600">
                        {formatPrice(c.totalPaid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Plans Performance */}
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Top Plans Performance</CardTitle>
            <CardDescription>
              Rasio efektivitas performa pendapatan per skema paket.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 text-muted-foreground border-y">
                  <tr>
                    <th className="px-3 py-2 font-medium">Plan Name</th>
                    <th className="px-3 py-2 font-medium">Subscribers</th>
                    <th className="px-3 py-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed">
                  {topPlans.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/10">
                      <td className="px-3 py-2.5 font-medium uppercase">{p.plan}</td>
                      <td className="px-3 py-2.5 font-medium">{p.subscribers}</td>
                      <td className="px-3 py-2.5 font-bold text-emerald-600">
                        {formatPrice(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
