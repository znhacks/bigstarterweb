"use client";

import * as React from "react";
import {
  Loader2,
  Building2,
  Users,
  CreditCard,
  Clock,
  Plus,
  UserPlus,
  Settings,
  History,
  CheckCircle2,
  Globe,
  DollarSign,
  Activity,
  ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
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
  usageStats,
  recentActivities,
  getRelativeTime,
  reloadWorkspaceData
}: ReturnType<typeof useUserWorkspaceDashboard>) {
  const t = useTranslations("user.dashboard");

  const formatPrice = (amount: number, currency?: string) =>
    formatCurrency(amount, locale, { currencyCode: currency ?? "USD" });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-3 px-4 py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            Welcome {profile?.full_name || "Workspace Member"} !
          </h1>
          {/* <p className="text-muted-foreground text-sm">
            Here&apos;s what&apos;s happening in your active workspace (
            <span className="text-foreground font-semibold">{activeTenant?.name || "Unknown"}</span>
            ).
          </p> */}
        </div>
      </div>

      {/* SECTION 2 — SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Organizations */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Organizations
              </span>
              <h4 className="text-foreground text-2xl font-extrabold">
                {metrics.totalOrganizations}
              </h4>
              <p className="text-muted-foreground text-[9px]">Joined workspaces</p>
            </div>
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Members in current workspace */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Team Members
              </span>
              <h4 className="text-foreground text-2xl font-extrabold">
                {metrics.totalTeamMembers}
              </h4>
              <p className="text-muted-foreground text-[9px]">Active in this workspace</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plan */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Subscription Plan
              </span>
              <h4 className="text-foreground max-w-[170px] truncate text-lg font-bold">
                {metrics.activePlanName}
              </h4>
              <p className="text-muted-foreground text-[9px]">Active plan type</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Expiry / Next Renewal */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Next Billing
              </span>
              <h4 className="text-foreground text-base font-bold">{metrics.billingStatus}</h4>
              <p className="text-muted-foreground text-[9px]">Renewal cycle limit</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold">Organization Overview</CardTitle>
            <CardDescription>Details of the currently active workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {activeTenant ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 border-b pb-3">
                  <div className="bg-secondary text-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
                    {activeTenant.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-foreground font-bold">{activeTenant.name}</h4>
                    <p className="text-muted-foreground text-[10px]">
                      {activeTenant.business_email || "No email listed"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-muted/20 rounded-lg border p-2">
                    <span className="text-muted-foreground block text-[9px] font-semibold uppercase">
                      Status
                    </span>
                    <Badge className="mt-1 bg-emerald-500/10 text-[9px] text-emerald-600 uppercase hover:bg-emerald-500/10">
                      {activeTenant.status}
                    </Badge>
                  </div>

                  <div className="bg-muted/20 rounded-lg border p-2">
                    <span className="text-muted-foreground block text-[9px] font-semibold uppercase">
                      Created
                    </span>
                    <span className="text-foreground mt-1 block font-mono text-[10px] font-bold">
                      {new Date(activeTenant.created_at).toLocaleDateString(
                        locale === "id" ? "id-ID" : "en-US"
                      )}
                    </span>
                  </div>

                  <div className="bg-muted/20 rounded-lg border p-2">
                    <span className="text-muted-foreground block text-[9px] font-semibold uppercase">
                      Locale
                    </span>
                    <span className="text-foreground mt-1 flex items-center gap-1 text-[10px] font-bold uppercase">
                      <Globe className="h-3 w-3" /> {activeTenant.default_locale || "en"}
                    </span>
                  </div>

                  <div className="bg-muted/20 rounded-lg border p-2">
                    <span className="text-muted-foreground block text-[9px] font-semibold uppercase">
                      Currency
                    </span>
                    <span className="text-foreground mt-1 flex items-center gap-1 text-[10px] font-bold uppercase">
                      <DollarSign className="h-3 w-3" /> {activeTenant.currency || "USD"}
                    </span>
                  </div>
                </div>

                <div className="bg-muted/10 text-muted-foreground rounded-lg border p-2 text-[10px]">
                  <strong>Timezone:</strong> {activeTenant.timezone || "UTC"}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground py-6 text-center">No active workspace selected</p>
            )}
          </CardContent>
        </Card>

        {/* SECTION 5 — MEMBERSHIPS TABLE */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">Your Memberships</CardTitle>
            <CardDescription>Workspaces and organizations you belong to.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b font-semibold">
                    <th className="py-2">Organization</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Joined At</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30 border-b transition last:border-0">
                      <td className="text-foreground py-2.5 font-bold">{m.tenants?.name}</td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                          {m.roles?.name || "Member"}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground py-2.5 font-mono">
                        {new Date(m.created_at).toLocaleDateString(
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

      {/* SUBSCRIPTION & BILLING ACTIVITY ROW */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* SECTION 6 — SUBSCRIPTION */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Recent Billing Activity</CardTitle>
              <CardDescription>Invoices and transactions for active organization.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View All <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b font-semibold">
                    <th className="py-2">Date</th>
                    <th className="py-2">Description</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground py-6 text-center">
                        No transactions registered yet.
                      </td>
                    </tr>
                  ) : (
                    tenantTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-muted/20 border-b transition last:border-0">
                        <td className="text-muted-foreground py-2 font-mono">
                          {new Date(tx.created_at).toLocaleDateString(
                            locale === "id" ? "id-ID" : "en-US"
                          )}
                        </td>
                        <td className="text-foreground py-2 font-bold">{tx.plan_name}</td>
                        <td className="text-foreground py-2 font-extrabold">
                          {formatPrice(tx.net_amount || tx.amount_in_idr || tx.amount, tx.currency)}
                        </td>
                        <td className="py-2">
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {/* SECTION 7 — RECENT BILLING ACTIVITY */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold">Subscription Details</CardTitle>
            <CardDescription>Current workspace billing configuration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenantSubscription ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Current Plan</span>
                  <Badge className="text-[10px] font-bold uppercase">
                    {tenantSubscription.plan_id || "Free"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    className={`rounded-full text-[9px] font-bold uppercase ${
                      tenantSubscription.status === "active"
                        ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15"
                        : "bg-amber-500/15 text-amber-600 hover:bg-amber-500/15"
                    }`}>
                    {tenantSubscription.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Payment Provider</span>
                  <span className="font-mono font-bold uppercase">
                    {tenantSubscription.provider || "Manual"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Renewal Date</span>
                  <span className="text-foreground font-semibold">
                    {tenantSubscription.ends_at
                      ? new Date(tenantSubscription.ends_at).toLocaleDateString(
                          locale === "id" ? "id-ID" : "en-US"
                        )
                      : "Lifetime / Unlimited"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Auto Renew</span>
                  <Badge
                    variant={tenantSubscription.cancel_at_period_end ? "destructive" : "secondary"}
                    className="text-[10px]">
                    {tenantSubscription.cancel_at_period_end ? "DISABLED" : "ENABLED"}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-muted-foreground text-xs">
                  No active subscription found on this workspace.
                </p>
                <Button className="mt-3 h-8 text-xs" size="sm">
                  Upgrade Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TEAM MEMBERS, USAGE METRICS, & ACTIVITIES ROW */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* SECTION 8 — TEAM MEMBERS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Team Members</CardTitle>
            <CardDescription>Collaborators in active workspace.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[220px] space-y-3 overflow-y-auto">
            {tenantMembers.length === 0 ? (
              <p className="text-muted-foreground py-2 text-center text-xs">
                No other members inside this workspace
              </p>
            ) : (
              tenantMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className="bg-secondary text-foreground flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">
                      {(member.profiles?.full_name || "M").substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-foreground text-xs font-bold">
                      {member.profiles?.full_name || "Workspace Member"}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase">
                    {member.roles?.name || "Member"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* SECTION 9 — USAGE METRICS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Workspace Usage</CardTitle>
            <CardDescription>Performance limits of active platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageStats.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-semibold">{item.name}</span>
                  <span className="text-foreground font-bold">{item.label}</span>
                </div>
                <div className="bg-secondary h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SECTION 10 — RECENT ACTIVITY FEED */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Workspace Activities</CardTitle>
            <CardDescription>Recent events inside organization logs.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {recentActivities.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 border-b pb-2.5 text-xs last:border-0 last:pb-0">
                <Activity className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <span className="text-foreground block font-medium">{activity.event}</span>
                  <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
                    <Clock className="h-3 w-3" /> {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
