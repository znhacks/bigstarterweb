"use client";

import * as React from "react";
import Link from "next/link";
import {
  Loader2,
  Building2,
  Users,
  CreditCard,
  Clock,
  Settings,
  Globe,
  DollarSign,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Zap,
  UserPlus,
  Receipt
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/i18n/currency";
import { useUserWorkspaceDashboard } from "./logic";

export function UserWorkspaceDashboard() {
  const state = useUserWorkspaceDashboard();
  return <UserWorkspaceDashboardView {...state} />;
}

function UserWorkspaceDashboardView({
  locale,
  isLoading,
  profile,
  memberships,
  activeTenant,
  tenantMembers,
  tenantSubscription,
  tenantTransactions,
  metrics,
  recentActivities,
  getRelativeTime,
  reloadWorkspaceData
}: ReturnType<typeof useUserWorkspaceDashboard>) {
  const isId = locale === "id";

  const formatPrice = (amount: number, currency?: string) =>
    formatCurrency(amount, locale, { currencyCode: currency ?? activeTenant?.currency ?? "USD" });

  if (isLoading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-xs font-medium">
            {isId ? "Memuat dasbor workspace..." : "Loading workspace dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  const tenantSlug = activeTenant?.slug || "";
  const activeMembership = memberships.find((m) => m.tenant_id === activeTenant?.id);
  const userRole = activeMembership?.roles?.name || (isId ? "Anggota" : "Member");


  return (
    <div className="mx-auto w-full space-y-6 py-4">
      {/* TOP BANNER / GREETING & QUICK ACTIONS */}
      <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                {isId ? "Selamat datang," : "Welcome,"} {profile?.full_name || (isId ? "Anggota Workspace" : "Workspace Member")}
              </h1>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {tenantSlug && (
            <>
              <Button asChild size="sm" variant="default" className="gap-1.5 text-xs font-semibold">
                <Link href={`/${tenantSlug}/pricing`}>
                  <Zap className="h-3.5 w-3.5" /> {isId ? "Tingkatkan Paket" : "Upgrade Plan"}
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs font-medium">
                <Link href={`/${tenantSlug}/organization/member`}>
                  <UserPlus className="h-3.5 w-3.5" /> {isId ? "Anggota Tim" : "Team Members"}
                </Link>
              </Button>
            </>
          )}
          <Button
            onClick={reloadWorkspaceData}
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            title={isId ? "Perbarui Data" : "Refresh Data"}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* SECTION 1 — TOP SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Team Members Card */}
        <Card className="transition-all hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                {isId ? "Anggota Tim" : "Team Members"}
              </span>
              <div className="flex items-baseline gap-2">
                <h3 className="text-foreground text-2xl font-extrabold font-mono">
                  {metrics.totalTeamMembers}
                </h3>
                <span className="text-muted-foreground text-xs">
                  {isId ? "anggota aktif" : "active members"}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {isId ? "Dalam organisasi aktif" : "In active organization"}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Subscription Plan */}
        <Card className="transition-all hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                {isId ? "Paket Langganan" : "Subscription Plan"}
              </span>
              <h3 className="text-foreground max-w-[160px] truncate text-base font-bold">
                {metrics.activePlanName}
              </h3>
              <div className="flex items-center gap-1">
                <Badge
                  variant={tenantSubscription?.status === "active" ? "default" : "secondary"}
                  className="text-[10px] uppercase py-0 px-1.5">
                  {tenantSubscription?.status || (isId ? "Gratis" : "Free")}
                </Badge>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Next Billing / Renewal */}
        <Card className="transition-all hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                {isId ? "Perpanjangan Berikutnya" : "Next Renewal"}
              </span>
              <h3 className="text-foreground text-sm font-bold truncate">
                {metrics.billingStatus}
              </h3>
              <p className="text-muted-foreground text-xs">
                {isId ? "Status siklus penagihan" : "Billing cycle status"}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2 — MAIN CONTENT SPLIT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Invoices & Billing Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
              <div>
                <CardTitle className="text-base font-bold">
                  {isId ? "Faktur & Transaksi Terbaru" : "Recent Invoices & Transactions"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isId ? "Riwayat pembayaran untuk workspace aktif." : "Payment history for active workspace."}
                </CardDescription>
              </div>
              {tenantSlug && (
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                  <Link href={`/${tenantSlug}/organization/history-billing`}>
                    {isId ? "Lihat Semua" : "View All"} <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b font-semibold">
                      <th className="py-2.5">{isId ? "Tanggal" : "Date"}</th>
                      <th className="py-2.5">{isId ? "Deskripsi" : "Description"}</th>
                      <th className="py-2.5">{isId ? "Jumlah" : "Amount"}</th>
                      <th className="py-2.5">{isId ? "Status" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-1.5">
                            <Receipt className="h-6 w-6 text-muted-foreground/60" />
                            <span>{isId ? "Belum ada riwayat transaksi." : "No transaction records registered yet."}</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      tenantTransactions.map((tx) => {
                        const isSuccess = ["paid", "completed", "success", "settlement"].includes(
                          tx.status?.toLowerCase()
                        );
                        return (
                          <tr
                            key={tx.id}
                            className="hover:bg-muted/20 border-b transition last:border-0">
                            <td className="text-muted-foreground py-3 font-mono">
                              {new Date(tx.created_at).toLocaleDateString(
                                locale === "id" ? "id-ID" : "en-US"
                              )}
                            </td>
                            <td className="text-foreground py-3 font-semibold">{tx.plan_name}</td>
                            <td className="text-foreground py-3 font-bold font-mono">
                              {formatPrice(tx.net_amount || tx.amount_in_idr || tx.amount, tx.currency)}
                            </td>
                            <td className="py-3">
                              <Badge
                                className={`rounded-full text-[10px] font-bold uppercase ${isSuccess
                                  ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15"
                                  : "bg-red-500/15 text-red-600 hover:bg-red-500/15"
                                  }`}>
                                {tx.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Team Members List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
              <div>
                <CardTitle className="text-base font-bold">{isId ? "Anggota Tim Workspace" : "Workspace Team Members"}</CardTitle>
                <CardDescription className="text-xs">{isId ? "Anggota dan kolaborator dalam workspace ini" : "Members and collaborators in this workspace"}</CardDescription>
              </div>
              {tenantSlug && (
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs px-2">
                  <Link href={`/${tenantSlug}/organization/member`}>{isId ? "Kelola Anggota" : "Manage Members"}</Link>
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
                {tenantMembers.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground text-xs">
                    {isId ? "Tidak ada anggota tim ditemukan" : "No team members found"}
                  </p>
                ) : (
                  tenantMembers.map((member) => {
                    const memberName =
                      member.profiles?.full_name ||
                      member.profiles?.name ||
                      (member.user_id === profile?.id ? profile?.full_name : null) ||
                      (isId ? "Anggota Workspace" : "Workspace Member");
                    const initials = memberName
                      .split(" ")
                      .map((n: string) => n[0])
                      .filter(Boolean)
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between border-b pb-2.5 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="bg-primary/10 text-primary flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate text-xs font-bold">
                              {memberName}
                            </p>
                            {member.profiles?.email && (
                              <p className="text-muted-foreground truncate text-[10px]">
                                {member.profiles.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold shrink-0">
                          {member.roles?.name || (isId ? "Anggota" : "Member")}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN / SIDEBAR */}
        <div className="space-y-6 lg:col-span-1">
          {/* Detailed Subscription Card */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-bold">
                {isId ? "Rincian Langganan" : "Subscription Details"}
              </CardTitle>
              <CardDescription className="text-xs">
                {isId ? "Status penagihan & paket aktif" : "Billing status & active package"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {tenantSubscription ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">{isId ? "Paket" : "Plan"}</span>
                    <Badge variant="outline" className="font-bold uppercase">
                      {tenantSubscription.plan_id || (isId ? "Gratis" : "Free")}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      className={`rounded-full text-[10px] font-bold uppercase ${tenantSubscription.status === "active"
                        ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15"
                        : "bg-amber-500/15 text-amber-600 hover:bg-amber-500/15"
                        }`}>
                      {tenantSubscription.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">{isId ? "Penyedia" : "Provider"}</span>
                    <span className="font-mono font-bold text-foreground uppercase">
                      {tenantSubscription.provider || "Manual"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">{isId ? "Tanggal Perpanjangan" : "Renewal Date"}</span>
                    <span className="text-foreground font-medium">
                      {tenantSubscription.ends_at
                        ? new Date(tenantSubscription.ends_at).toLocaleDateString(
                          locale === "id" ? "id-ID" : "en-US"
                        )
                        : (isId ? "Seumur Hidup / Tanpa Batas" : "Lifetime / Unlimited")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-1">
                    <span className="text-muted-foreground">{isId ? "Perpanjang Otomatis" : "Auto-Renew"}</span>
                    <Badge
                      variant={tenantSubscription.cancel_at_period_end ? "destructive" : "secondary"}
                      className="text-[10px]">
                      {tenantSubscription.cancel_at_period_end ? (isId ? "Nonaktif" : "Disabled") : (isId ? "Aktif" : "Enabled")}
                    </Badge>
                  </div>

                  {tenantSlug && (
                    <Button asChild className="w-full text-xs font-semibold gap-1 mt-2" size="sm">
                      <Link href={`/${tenantSlug}/pricing`}>
                        <Zap className="h-3.5 w-3.5" /> {isId ? "Kelola / Tingkatkan Paket" : "Manage / Upgrade Plan"}
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 py-4 text-center">
                  <p className="text-muted-foreground text-xs">
                    {isId ? "Tidak ada langganan berbayar yang aktif." : "No paid subscription currently active."}
                  </p>
                  {tenantSlug && (
                    <Button asChild size="sm" className="w-full text-xs font-semibold gap-1">
                      <Link href={`/${tenantSlug}/pricing`}>
                        <Zap className="h-3.5 w-3.5" /> {isId ? "Tingkatkan Paket" : "Upgrade Plan"}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Memberships / Workspaces list */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-bold">{isId ? "Workspace Anda" : "Your Workspaces"}</CardTitle>
              <CardDescription className="text-xs">{isId ? "Organisasi yang Anda ikuti" : "Organizations you belong to"}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2.5">
                {memberships.map((m) => {
                  const isActive = m.tenants?.id === activeTenant?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition ${isActive ? "border-primary/50 bg-primary/5" : "bg-card hover:bg-muted/30"
                        }`}>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground truncate font-bold">
                            {m.tenants?.name}
                          </span>
                          {isActive && (
                            <Badge className="text-[9px] py-0 px-1 bg-primary text-primary-foreground">
                              {isId ? "Aktif" : "Active"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-[10px]">
                          Role: <span className="font-semibold">{m.roles?.name || (isId ? "Anggota" : "Member")}</span>
                        </p>
                      </div>
                      {m.tenants?.slug && !isActive && (
                        <Button asChild variant="ghost" size="sm" className="h-7 text-[11px] px-2">
                          <Link href={`/${m.tenants.slug}/dashboard`}>{isId ? "Pindah" : "Switch"}</Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-bold">{isId ? "Aktivitas Terbaru" : "Recent Activities"}</CardTitle>
              <CardDescription className="text-xs">{isId ? "Log aktivitas workspace" : "Workspace activity logs"}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3.5">
                {recentActivities.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <div className="mt-0.5 bg-primary/10 text-primary rounded-full p-1">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-foreground font-medium text-xs leading-tight">
                        {activity.event}
                      </p>
                      <span className="text-muted-foreground text-[10px] block">
                        {activity.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
