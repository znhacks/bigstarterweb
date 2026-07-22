"use client";

import * as React from "react";
import { useMemo } from "react";
import {
  Loader2,
  Building2,
  CreditCard,
  DollarSign,
  Users,
  Database,
  Ticket,
  TrendingUp,
  Activity,
  Plus,
  ArrowRight,
  RefreshCw,
  Bell,
  Clock,
  ExternalLink,
  ShieldAlert,
  CheckCircle2
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
import { formatCurrency } from "@/lib/i18n/currency";
import { useSuperadminMainDashboard } from "./logic";
import { APP_BASE_CURRENCY } from "@/config/billing-rates";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"];

export function SuperadminMainDashboard() {
  const state = useSuperadminMainDashboard();
  return <SuperadminMainDashboardView {...state} />;
}

function SuperadminMainDashboardView({
  locale,
  isLoading,
  revenueFilter,
  setRevenueFilter,
  metrics,
  revenueChartData,
  subscriptionStatusData,
  tenantGrowthData,
  revenueByProviderData,
  popularPlansData,
  recentTransactions,
  latestTenants,
  expiringSubscriptions,
  couponStats,
  dbModelDistribution,
  tenantStatusData,
  userStatusData,
  currencyDistribution,
  topPayingTenants,
  notifications,
  loadAllDashboardData
}: ReturnType<typeof useSuperadminMainDashboard>) {
  const t = useTranslations("superadmin.dashboard");

  const formatPrice = (amount: number, currency?: string) =>
    formatCurrency(amount, locale, { currencyCode: currency ?? APP_BASE_CURRENCY });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-6 px-4 py-3">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Main Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Ringkasan global untuk analisis sistem saas, penagihan, pengguna, dan data tenant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={loadAllDashboardData}
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-xs font-semibold">
            <RefreshCw className="h-4 w-4" />
            Segarkan Data
          </Button>
        </div>
      </div>

      {/* 1. KPI CARDS (8 Cards Grid) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tenants */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Tenants
              </span>
              <h4 className="text-foreground text-2xl font-extrabold">{metrics.totalTenants}</h4>
              <p className="text-muted-foreground text-[9px]">Organisasi terdaftar</p>
            </div>
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Subs */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Active Subs
              </span>
              <h4 className="text-foreground text-2xl font-extrabold">{metrics.activeSubs}</h4>
              <p className="text-muted-foreground text-[9px]">Berlangganan aktif</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Total Revenue
              </span>
              <h4 className="text-2xl font-extrabold text-emerald-600">
                {formatPrice(metrics.totalRevenue)}
              </h4>
              <p className="text-muted-foreground text-[9px]">Sistem penagihan bersih</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Total Users
              </span>
              <h4 className="text-foreground text-2xl font-extrabold">{metrics.totalUsers}</h4>
              <p className="text-muted-foreground text-[9px]">Profil terdaftar</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Active Plans
              </span>
              <h4 className="text-foreground text-xl font-bold">{metrics.activePlans} Plans</h4>
              <p className="text-muted-foreground text-[9px]">Layanan aktif sistem</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Database className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Transactions
              </span>
              <h4 className="text-foreground text-xl font-bold">{metrics.totalTransactions} Tx</h4>
              <p className="text-muted-foreground text-[9px]">Transaksi keseluruhan</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Coupons */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Active Coupons
              </span>
              <h4 className="text-foreground text-xl font-bold">{metrics.activeCoupons} Promo</h4>
              <p className="text-muted-foreground text-[9px]">Kupon berlaku</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600">
              <Ticket className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Growth */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                User Growth
              </span>
              <h4 className="text-2xl font-extrabold text-blue-600">{metrics.growth}</h4>
              <p className="text-muted-foreground text-[9px]">Metrik pendaftaran 30 hari</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* REVENUE CHART & SUBSCRIPTION STATUS ROW */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 2. Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col items-start justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-base font-bold">Revenue Analytics</CardTitle>
              <CardDescription>
                Grafik pergerakan pendapatan kotor penagihan subscription.
              </CardDescription>
            </div>
            <div className="bg-muted/30 flex rounded-lg border p-0.5">
              {(["7d", "30d", "12m"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setRevenueFilter(filter)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold uppercase transition-all ${
                    revenueFilter === filter
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {filter}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
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
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatPrice(value), "Revenue"]}
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. Subscription Overview (Pie Status) */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold">Subscription Status</CardTitle>
            <CardDescription>Pembagian proporsi siklus langganan aktif.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pb-6">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptionStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value">
                    {subscriptionStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} Subs`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-2 text-xs">
              {subscriptionStatusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 rounded-lg border p-1.5">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate font-semibold uppercase">
                    {entry.name}
                  </span>
                  <span className="text-foreground ml-auto font-bold">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NEW TENANT GROWTH & REVENUE BY PROVIDER */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 4. New Tenant Growth */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">New Tenant Growth</CardTitle>
            <CardDescription>Statistik pendaftaran instansi organisasi per bulan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {tenantGrowthData.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                  Tidak ada data pendaftaran
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tenantGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
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
                    <Bar
                      dataKey="Tenants"
                      name="Tenants Baru"
                      fill="#0ea5e9"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 5. Revenue by Provider */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold">Revenue by Provider</CardTitle>
            <CardDescription>Akumulasi pendapatan bersih pintu pembayaran.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pb-6">
            <div className="h-44 w-full">
              {revenueByProviderData.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                  Belum ada data pembayaran
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByProviderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value">
                      {revenueByProviderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [formatPrice(value)]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs">
              {revenueByProviderData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-foreground font-medium uppercase">{entry.name}</span>
                  <span className="text-muted-foreground">({formatPrice(entry.value)})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* POPULAR PLANS & TENANT STATUS DISTRIBUTION */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 6. Popular Plans */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">Popular Plans</CardTitle>
            <CardDescription>
              Rincian alokasi dan popularitas plan yang dipilih oleh tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {popularPlansData.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                  Tidak ada pendaftaran paket aktif
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={popularPlansData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
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
                    <Bar dataKey="Count" name="Total Tenant" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 12. Tenant Status Distribution */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold">Tenant Status</CardTitle>
            <CardDescription>Distribusi status hukum instansi organisasi.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pb-6">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tenantStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value">
                    {tenantStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[10px]">
              {tenantStatusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-foreground font-semibold uppercase">{entry.name}</span>
                  <span className="text-muted-foreground">({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7. RECENT TRANSACTIONS (Table Limit 20) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Recent Transactions (Last 20)</CardTitle>
          <CardDescription>Catatan aliran dana terverifikasi pada sistem.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="text-muted-foreground border-b font-bold tracking-wider uppercase">
                  <th className="py-2.5">Tenant</th>
                  <th className="py-2.5">Plan</th>
                  <th className="py-2.5">Amount</th>
                  <th className="py-2.5">Provider</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground py-6 text-center">
                      Tidak ada transaksi baru
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/40 border-b transition last:border-0">
                      <td className="text-foreground py-3 font-semibold">
                        {tx.tenants?.name || "Unknown Tenant"}
                      </td>
                      <td className="text-muted-foreground py-3">{tx.plan_name}</td>
                      <td className="text-foreground py-3 font-extrabold">
                        {formatPrice(tx.net_amount || tx.amount_in_idr || tx.amount, tx.currency)}
                      </td>
                      <td className="py-3 font-mono text-[10px] uppercase">
                        {tx.provider || "Manual"}
                      </td>
                      <td className="py-3">
                        <Badge
                          className={`rounded-full text-[9px] font-bold uppercase ${
                            ["paid", "completed", "success", "settlement"].includes(
                              tx.status?.toLowerCase()
                            )
                              ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15"
                              : "bg-red-500/15 text-red-600 hover:bg-red-500/15"
                          }`}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground py-3">
                        {new Date(tx.created_at).toLocaleDateString(
                          locale === "id" ? "id-ID" : "en-US"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 8. LATEST TENANTS (List layout) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Latest Tenants</CardTitle>
          <CardDescription>Organisasi instansi yang baru terdaftar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {latestTenants.length === 0 ? (
              <p className="text-muted-foreground py-2 text-center text-xs">
                Belum ada tenant baru
              </p>
            ) : (
              latestTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary text-foreground flex h-9 w-9 items-center justify-center rounded-full font-bold">
                      {tenant.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-foreground text-xs font-bold">{tenant.name}</h4>
                      <p className="text-muted-foreground flex items-center gap-1 text-[10px]">
                        <Clock className="h-3 w-3" /> {tenant.relativeTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[9px] uppercase">
                      {tenant.db_model}
                    </Badge>
                    <Badge className="bg-emerald-500/10 text-[9px] text-emerald-600 uppercase hover:bg-emerald-500/10">
                      {tenant.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 9. EXPIRING SUBSCRIPTIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">
            Expiring Subscriptions (Next 7 Days)
          </CardTitle>
          <CardDescription>Siklus langganan yang akan segera berakhir.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="text-muted-foreground border-b font-semibold">
                  <th className="py-2">Tenant</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2">Expired At</th>
                  <th className="py-2">Time Left</th>
                </tr>
              </thead>
              <tbody>
                {expiringSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-muted-foreground py-6 text-center">
                      Tidak ada subscription yang kedaluwarsa dalam 7 hari kedepan.
                    </td>
                  </tr>
                ) : (
                  expiringSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b last:border-0">
                      <td className="text-foreground py-2.5 font-bold">{sub.tenantName}</td>
                      <td className="py-2.5 font-mono">{sub.planId}</td>
                      <td className="text-muted-foreground py-2.5">
                        {new Date(sub.endsAt).toLocaleDateString(
                          locale === "id" ? "id-ID" : "en-US"
                        )}
                      </td>
                      <td className="py-2.5">
                        <Badge variant="destructive" className="text-[9px] font-bold uppercase">
                          {sub.daysLeft} days left
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* TOP PAYING TENANTS & COUPON STATS ROW */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 15. Top Paying Tenant */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Top Customers</CardTitle>
            <CardDescription>Tenant penyumbang pendapatan terbesar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPayingTenants.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-xs">
                Belum ada pembayaran terverifikasi
              </p>
            ) : (
              topPayingTenants.map((customer, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono text-xs font-bold">
                      #{index + 1}
                    </span>
                    <span className="text-foreground text-xs font-bold">{customer.name}</span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-600">
                    {formatPrice(customer.totalPaid)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 10. Coupon Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Coupon Usage & Analytics</CardTitle>
            <CardDescription>Statistik kode promo diskon aktif.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3 text-center">
              <span className="text-muted-foreground text-[10px] font-bold uppercase">
                SUM Redeemed
              </span>
              <h5 className="text-foreground mt-1 text-xl font-extrabold">
                {couponStats.totalRedeemed}x
              </h5>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <span className="text-muted-foreground text-[10px] font-bold uppercase">
                Most Used Coupon
              </span>
              <h5 className="text-foreground mt-1 truncate text-xs font-extrabold">
                {couponStats.mostUsed}
              </h5>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <span className="text-muted-foreground text-[10px] font-bold uppercase">
                Unused Coupons
              </span>
              <h5 className="text-foreground mt-1 text-xl font-extrabold">
                {couponStats.unusedCount}
              </h5>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <span className="text-muted-foreground text-[10px] font-bold uppercase">
                Expired Coupons
              </span>
              <h5 className="mt-1 text-xl font-extrabold text-red-500">
                {couponStats.expiredCount}
              </h5>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ADDITIONAL PARAMETERS (DATABASE, USER STATUS, CURRENCY) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 11. Database Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Database Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dbModelDistribution.map((item, index) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground">{item.name}</span>
                  <span className="text-muted-foreground">
                    {item.value} ({item.percentage}%)
                  </span>
                </div>
                <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 13. User Status */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold">User Status Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 pb-6">
            <div className="rounded-lg border p-2.5 text-center">
              <span className="text-muted-foreground text-[9px] font-bold uppercase">Active</span>
              <h6 className="text-foreground mt-0.5 text-lg font-bold">{userStatusData.active}</h6>
            </div>
            <div className="rounded-lg border p-2.5 text-center">
              <span className="text-muted-foreground text-[9px] font-bold uppercase">Deleted</span>
              <h6 className="text-foreground mt-0.5 text-lg font-bold">{userStatusData.deleted}</h6>
            </div>
            <div className="rounded-lg border p-2.5 text-center">
              <span className="text-muted-foreground text-[9px] font-bold uppercase">Banned</span>
              <h6 className="mt-0.5 text-lg font-bold text-red-500">{userStatusData.banned}</h6>
            </div>
            <div className="rounded-lg border p-2.5 text-center">
              <span className="text-muted-foreground text-[9px] font-bold uppercase">
                Banned Current
              </span>
              <h6 className="mt-0.5 text-lg font-bold text-red-600">
                {userStatusData.currentlyBanned}
              </h6>
            </div>
          </CardContent>
        </Card>

        {/* 14. Currency Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Currency Distribution</CardTitle>
          </CardHeader>
          <CardContent className="max-h-40 space-y-2 overflow-y-auto">
            {currencyDistribution.map((cur) => (
              <div
                key={cur.name}
                className="flex items-center justify-between border-b pb-1.5 last:border-0 last:pb-0">
                <span className="text-foreground font-mono text-xs font-bold">{cur.name}</span>
                <span className="text-muted-foreground text-xs">{cur.value} tenants</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* QUICK ACTIONS & NOTIFICATIONS PANEL */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 16. Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
            <CardDescription>Pintasan cepat manajemen fungsional superadmin.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start gap-2 text-xs" size="sm">
              <Plus className="h-3.5 w-3.5" /> Create Plan
            </Button>
            <Button variant="outline" className="justify-start gap-2 text-xs" size="sm">
              <Plus className="h-3.5 w-3.5" /> Create Coupon
            </Button>
            <Button variant="outline" className="justify-start gap-2 text-xs" size="sm">
              <Plus className="h-3.5 w-3.5" /> Add Tenant
            </Button>
            <Button variant="outline" className="justify-start gap-2 text-xs" size="sm">
              <ExternalLink className="h-3.5 w-3.5" /> View Transactions
            </Button>
            <Button variant="outline" className="col-span-2 justify-center gap-2 text-xs" size="sm">
              <ArrowRight className="h-3.5 w-3.5" /> View Subscriptions
            </Button>
          </CardContent>
        </Card>

        {/* 17. Notification Panel */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Bell className="h-5 w-5 text-amber-500" />
              Notification Panel
            </CardTitle>
            <CardDescription>
              Pemberitahuan sistem kesehatan ekosistem SaaS saat ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-2">
            {notifications.length === 0 ? (
              <div className="text-muted-foreground flex h-full items-center justify-center py-4 text-xs">
                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                Semua sistem berjalan normal tanpa peringatan.
              </div>
            ) : (
              notifications.map((notif, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-lg border border-amber-500/10 bg-amber-500/5 p-2 text-xs">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-foreground font-medium">{notif}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
