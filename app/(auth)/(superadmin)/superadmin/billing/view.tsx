"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Loader2,
  DollarSign,
  CreditCard,
  Undo2,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Check,
  Ban,
  Package,
  FileCode
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Impor klien Supabase, Global Language Hook, dan Config Statis
import { supabase } from "@/lib/supabase";
import { plans as billingPlans } from "@/config/billing";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatTransactionAmount } from "@/lib/i18n/currency";

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

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export function SuperadminBillingDashboard() {
  const locale = useLocale();
  const t = useTranslations("superadmin.billing");

  // Formatter harga lokal — default IDR (base currency aplikasi).
  const formatPrice = (amount: number, currency?: string) =>
    formatCurrency(amount, locale, { currencyCode: currency ?? "IDR" });

  // State Data Global dari Supabase
  const [transactions, setTransactions] = useState<SuperadminTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<SuperadminSubscription[]>([]);
  const [refundRequests, setRefundRequests] = useState<SuperadminSubscription[]>([]);

  // State KPI Metrics
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeSubsCount, setActiveSubsCount] = useState(0);

  // State Interaksi & Loading
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);

  useEffect(() => {
    loadSuperadminData();
  }, []);

  const loadSuperadminData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchTransactions(), fetchSubscriptionsAndRefunds()]);
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

      // Total pendapatan dihitung dalam IDR (amount_in_idr) agar konsisten lintas mata uang.
      // Status sukses pembayaran: "paid" (webhook) — fallback "completed" untuk data lama.
      const PAID = ["paid", "completed"];
      const total = txs
        .filter((tx) => PAID.includes(tx.status?.toLowerCase()))
        .reduce((sum, tx) => sum + (tx.amount_in_idr ?? tx.amount ?? 0), 0);
      setTotalRevenue(total);
    }
  };

  // 2. Ambil seluruh data langganan & filter pengajuan refund dengan mencocokkan config statis
  const fetchSubscriptionsAndRefunds = async () => {
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
        const planConfig = billingPlans.find((p) => p.id === sub.plan_id);
        // Tampilkan harga bulanan (plan disimpan di config/billing.ts, bukan DB)
        const price = planConfig ? planConfig.prices.monthly.amount : 0;

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

      const refunds = mappedSubs.filter((sub) => sub.status === "refund_requested");
      setRefundRequests(refunds);
    }
  };

  // Handler: Setujui Klaim Refund
  const handleApproveRefund = async (
    subId: string,
    tenantId: string,
    planName: string,
    amount: number
  ) => {
    setIsProcessingAction(subId);
    try {
      const { error: subError } = await supabase
        .from("subscriptions")
        .update({ status: "inactive" })
        .eq("id", subId);

      if (subError) throw subError;

      const { error: txError } = await supabase.from("transactions").insert({
        tenant_id: tenantId,
        amount: -amount,
        plan_name: planName,
        order_id: `REFUND-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        status: "refunded"
      });

      if (txError) throw txError;

      setAlertMessage({
        title: t("alerts.approveTitle") || "Refund Approved",
        description: t("alerts.approveDesc") || "The refund request was successfully approved.",
        variant: "default"
      });

      await loadSuperadminData();
    } catch (e: any) {
      setAlertMessage({
        title: t("alerts.failed") || "Action Failed",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingAction(null);
    }
  };

  // Handler: Tolak Klaim Refund
  const handleRejectRefund = async (subId: string) => {
    setIsProcessingAction(subId);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("id", subId);

      if (error) throw error;

      setAlertMessage({
        title: t("alerts.rejectTitle") || "Refund Rejected",
        description: t("alerts.rejectDesc") || "The refund request has been declined.",
        variant: "default"
      });

      await loadSuperadminData();
    } catch (e: any) {
      setAlertMessage({
        title: t("alerts.failed") || "Action Failed",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingAction(null);
    }
  };

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

      {/* ALERT NOTIFICATION */}
      {alertMessage && (
        <Alert
          variant={alertMessage.variant === "destructive" ? "destructive" : "default"}
          className="border-border/80 relative flex items-start gap-3 rounded-xl border pe-10">
          {alertMessage.variant === "destructive" ? (
            <AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <div className="space-y-1">
            <AlertTitle className="font-semibold">{alertMessage.title}</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {alertMessage.description}
            </AlertDescription>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-muted-foreground hover:text-foreground absolute inset-e-4 top-4 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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

        {/* Card 3: Pending Refunds */}
        <Card
          className={`rounded-2xl border shadow-sm ${refundRequests.length > 0 ? "animate-pulse border-amber-500 bg-amber-500/5" : "border-border/80"}`}>
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("kpis.refunds")}
              </span>
              <h3 className="text-foreground text-3xl font-bold tracking-tight">
                {refundRequests.length}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Undo2 className="h-6 w-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABS MANAGEMENT */}
      <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
        <CardContent className="space-y-6 p-8">
          <Tabs defaultValue="refunds" className="w-full space-y-6">
            <TabsList className="border-border/60 h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="refunds"
                className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-semibold shadow-none transition-all data-[state=active]:bg-transparent">
                {t("tabs.refunds")} ({refundRequests.length})
              </TabsTrigger>
              <TabsTrigger
                value="subscriptions"
                className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-semibold shadow-none transition-all data-[state=active]:bg-transparent">
                {t("tabs.subscriptions")} ({subscriptions.length})
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-semibold shadow-none transition-all data-[state=active]:bg-transparent">
                {t("tabs.history")} ({transactions.length})
              </TabsTrigger>
              <TabsTrigger
                value="plans"
                className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-semibold shadow-none transition-all data-[state=active]:bg-transparent">
                {t("tabs.plans") || "Plans"} ({billingPlans.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB CONTENT 1: REFUND REQUESTS */}
            <TabsContent value="refunds" className="mt-0 space-y-4 focus-visible:outline-none">
              {refundRequests.length === 0 ? (
                <div className="text-muted-foreground py-10 text-center text-sm">
                  {t("placeholders.noRefunds")}
                </div>
              ) : (
                refundRequests.map((sub) => (
                  <div
                    key={sub.id}
                    className="border-border/60 bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
                        <Building2 className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground text-sm font-bold">
                            {sub.tenants?.name || "Unknown Tenant"}
                          </span>
                          <Badge className="rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-bold text-amber-600 hover:bg-amber-500/10">
                            {sub.plans?.name} Plan
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {t("placeholders.refundAmount")}:{" "}
                          <strong className="text-foreground">
                            {formatPrice(sub.plans?.price || 0)}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-3">
                      <Button
                        onClick={() => handleRejectRefund(sub.id)}
                        disabled={isProcessingAction !== null}
                        variant="outline"
                        className="border-border/80 inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold">
                        {isProcessingAction === sub.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                        {t("buttons.reject")}
                      </Button>
                      <Button
                        onClick={() =>
                          handleApproveRefund(
                            sub.id,
                            sub.tenant_id,
                            sub.plans?.name || "Pro",
                            sub.plans?.price || 0
                          )
                        }
                        disabled={isProcessingAction !== null}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-red-700 px-4 text-xs font-semibold text-white hover:bg-red-800">
                        {isProcessingAction === sub.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {t("buttons.approve")}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* TAB CONTENT 2: ACTIVE SUBSCRIPTIONS */}
            <TabsContent
              value="subscriptions"
              className="mt-0 space-y-4 focus-visible:outline-none">
              {subscriptions.length === 0 ? (
                <div className="text-muted-foreground py-10 text-center text-sm">
                  No active subscriptions found.
                </div>
              ) : (
                subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="border-border/60 bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                        <Building2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground text-sm font-bold">
                            {sub.tenants?.name || "Unknown Tenant"}
                          </span>
                          <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-600 hover:bg-emerald-500/10">
                            {sub.plans?.name} Plan
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {t("placeholders.expiry")}:{" "}
                          <strong className="text-foreground">
                            {sub.ends_at
                              ? new Date(sub.ends_at).toLocaleDateString("id-ID")
                              : t("placeholders.unlimited")}
                          </strong>{" "}
                          {sub.cancel_at_period_end && (
                            <span className="text-red-500">{t("placeholders.renewOff")}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="text-foreground text-lg font-bold">
                        {formatPrice(sub.plans?.price || 0)}
                      </span>
                      <span className="text-muted-foreground text-xs">/mo</span>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* TAB CONTENT 3: TRANSACTION HISTORY */}
            <TabsContent value="transactions" className="mt-0 space-y-4 focus-visible:outline-none">
              {transactions.length === 0 ? (
                <div className="text-muted-foreground py-10 text-center text-sm">
                  {t("placeholders.noTransactions")}
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="border-border/60 bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                          tx.status === "refunded"
                            ? "border-red-500/20 bg-red-500/10"
                            : "border-emerald-500/20 bg-emerald-500/10"
                        }`}>
                        <DollarSign
                          className={`h-5 w-5 ${tx.status === "refunded" ? "text-red-600" : "text-emerald-600"}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground text-sm font-bold">
                            {tx.tenants?.name || "Unknown Tenant"}
                          </span>
                          <span className="text-muted-foreground text-xs">({tx.order_id})</span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {t("placeholders.purchasedOn")
                            .replace("{planName}", tx.plan_name)
                            .replace("{date}", new Date(tx.created_at).toLocaleDateString("id-ID"))}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-end">
                      <span
                        className={`text-lg font-bold ${tx.status === "refunded" ? "text-red-600" : "text-foreground"}`}>
                        {tx.status === "refunded" ? "-" : ""}
                        {formatTransactionAmount(tx.amount, tx.currency, tx.amount_in_idr, locale)}
                      </span>
                      <Badge
                        className={`rounded-full text-[9px] font-bold ${
                          tx.status === "refunded"
                            ? "border border-red-500/20 bg-red-500/10 text-red-600"
                            : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                        }`}>
                        {tx.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* TAB CONTENT 4: CONFIG PLANS (READ-ONLY) */}
            <TabsContent value="plans" className="mt-0 space-y-4 focus-visible:outline-none">
              {/* Banner Informasi Sinkronisasi Konfigurasi */}
              <div className="bg-muted/40 border-border/80 flex items-center justify-between gap-4 rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-9 w-9 animate-pulse items-center justify-center rounded-lg">
                    <FileCode className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-foreground text-sm font-semibold">Statically Configured</h4>
                    <p className="text-muted-foreground text-xs">
                      Subscription plans are managed inside code configuration file (
                      <code className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]">
                        config/billing.ts
                      </code>
                      ).
                    </p>
                  </div>
                </div>
              </div>

              {billingPlans.map((plan) => {
                // Melakukan asersi tipe (type assertion) as any secara merata untuk menghindari error tipe objek Plan
                const planConfig = plan as any;
                const planFeatures = planConfig.features as string[] | undefined;
                const maxUsers = planConfig.maxUsers as number | undefined;

                return (
                  <div
                    key={planConfig.id}
                    className="border-border/60 bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                      <div className="border-primary/20 bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                        <Package className="text-primary h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground text-sm font-bold">
                            {planConfig.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="rounded-full text-[9px] font-bold tracking-wider uppercase">
                            {planConfig.id}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs">{planConfig.description}</p>

                        {/* Render Fitur-fitur secara aman */}
                        {planFeatures && planFeatures.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1.5">
                            {planFeatures.map((feat, fIdx) => (
                              <Badge
                                key={fIdx}
                                variant="secondary"
                                className="rounded-md px-2 py-0.5 text-[9px]">
                                {feat}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tampilan Harga dan Atribut Pengguna */}
                    <div className="flex shrink-0 items-center justify-between gap-6 border-t pt-3 md:justify-end md:border-t-0 md:pt-0">
                      <div className="text-start md:text-end">
                        <div className="text-foreground text-lg font-extrabold">
                          {formatPrice(planConfig.prices?.monthly?.amount || 0)}
                          <span className="text-muted-foreground text-xs font-normal">/mo</span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {formatPrice(planConfig.prices?.yearly?.amount || 0)}
                          <span className="text-[10px]">/yr</span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-[10px]">
                          {t("placeholders.maxUsers") || "Max Users"}:{" "}
                          <strong>
                            {maxUsers === undefined || maxUsers === 9999
                              ? t("placeholders.unlimited") || "Unlimited"
                              : maxUsers}
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
