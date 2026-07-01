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
  Plus,
  Pencil,
  Trash2,
  Package
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

// Impor klien Supabase & Global Language Hook
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/providers/language-provider";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";

interface SuperadminTransaction {
  id: string;
  amount: number;
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

interface DBPlan {
  id: string;
  name: string;
  price: number;
  max_users: number;
  type: string;
  description: string[] | null;
}

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.billing");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function SuperadminBillingDashboard() {
  const { formatPrice } = useLanguage();
  const locale = useLocale();
  const t = useTranslations("superadmin.billing");

  // State Data Global dari Supabase
  const [transactions, setTransactions] = useState<SuperadminTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<SuperadminSubscription[]>([]);
  const [refundRequests, setRefundRequests] = useState<SuperadminSubscription[]>([]);
  const [allDbPlans, setAllDbPlans] = useState<DBPlan[]>([]);

  // State Form CRUD Plans
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DBPlan | null>(null); // Null berarti membuat paket baru
  const [formPlanName, setFormPlanName] = useState("");
  const [formPlanPrice, setFormPlanPrice] = useState(0);
  const [formPlanMaxUsers, setFormPlanMaxUsers] = useState(5);
  const [formPlanType, setFormPlanType] = useState("monthly");
  const [formPlanFeatures, setFormPlanFeatures] = useState("");

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

  // Memuat seluruh data transaksi, langganan, dan daftar paket langsung dari database
  const loadSuperadminData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchTransactions(), fetchSubscriptionsAndRefunds(), fetchAllPlans()]);
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

      const total = txs
        .filter((tx) => tx.status === "completed")
        .reduce((sum, tx) => sum + tx.amount, 0);
      setTotalRevenue(total);
    }
  };

  // 2. Ambil seluruh data langganan & filter pengajuan refund
  const fetchSubscriptionsAndRefunds = async () => {
    const { data, error } = await supabase.from("subscriptions").select(`
        id,
        tenant_id,
        status,
        ends_at,
        cancel_at_period_end,
        tenants (
          name
        ),
        plans (
          name,
          price
        )
      `);

    if (error) throw error;

    if (data) {
      const subs = data as unknown as SuperadminSubscription[];

      const activeSubs = subs.filter((sub) => sub.status === "active");
      setSubscriptions(activeSubs);
      setActiveSubsCount(activeSubs.length);

      const refunds = subs.filter((sub) => sub.status === "refund_requested");
      setRefundRequests(refunds);
    }
  };

  // 3. Ambil daftar paket secara dinamis dari tabel public.plans
  const fetchAllPlans = async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("price", { ascending: true });

    if (error) throw error;
    setAllDbPlans(data || []);
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
        title: t("alerts.approveTitle"),
        description: t("alerts.approveDesc"),
        variant: "default"
      });

      await loadSuperadminData();
    } catch (e: any) {
      setAlertMessage({
        title: t("alerts.failed"),
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
        title: t("alerts.rejectTitle"),
        description: t("alerts.rejectDesc"),
        variant: "default"
      });

      await loadSuperadminData();
    } catch (e: any) {
      setAlertMessage({
        title: t("alerts.failed"),
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingAction(null);
    }
  };

  // Openers untuk Modal Form CRUD Plans
  const openCreatePlanModal = () => {
    setEditingPlan(null);
    setFormPlanName("");
    setFormPlanPrice(0);
    setFormPlanMaxUsers(5);
    setFormPlanType("monthly");
    setFormPlanFeatures("");
    setIsPlanModalOpen(true);
  };

  const openEditPlanModal = (plan: DBPlan) => {
    setEditingPlan(plan);
    setFormPlanName(plan.name);
    setFormPlanPrice(plan.price);
    setFormPlanMaxUsers(plan.max_users);
    setFormPlanType(plan.type);
    setFormPlanFeatures(plan.description ? plan.description.join(", ") : "");
    setIsPlanModalOpen(true);
  };

  // Handler CRUD: Simpan / Perbarui Paket di Database Supabase
  const handleSavePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingAction("saving-plan");

    // Mengurai teks koma menjadi bentuk array text[] bersih untuk database
    const featuresArray = formPlanFeatures
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    try {
      const payload = {
        name: formPlanName.trim(),
        price: Number(formPlanPrice),
        max_users: Number(formPlanMaxUsers),
        type: formPlanType,
        description: featuresArray
      };

      if (editingPlan) {
        // Aksi UPDATE
        const { error } = await supabase.from("plans").update(payload).eq("id", editingPlan.id);

        if (error) throw error;
      } else {
        // Aksi INSERT (CREATE NEW)
        const { error } = await supabase.from("plans").insert(payload);

        if (error) throw error;
      }

      setAlertMessage({
        title: locale === "en" ? "Success" : "Sukses",
        description: t("alerts.successPlan"),
        variant: "default"
      });

      setIsPlanModalOpen(false);
      await fetchAllPlans();
    } catch (error: any) {
      setAlertMessage({
        title: t("alerts.failed"),
        description: error.message || "Gagal menyelaraskan perubahan paket ke database.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingAction(null);
    }
  };

  // Handler CRUD: Hapus Paket dari Database
  const handleDeletePlan = async (planId: string, planName: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus paket '${planName}' secara permanen dari database?`
      )
    )
      return;
    setIsProcessingAction(planId);

    try {
      const { error } = await supabase.from("plans").delete().eq("id", planId);

      if (error) throw error;

      setAlertMessage({
        title: locale === "en" ? "Plan Deleted" : "Paket Dihapus",
        description: `Paket '${planName}' berhasil dihapus secara aman dari database.`,
        variant: "default"
      });

      await fetchAllPlans();
    } catch (error: any) {
      setAlertMessage({
        title: t("alerts.failed"),
        description:
          error.message ||
          "Gagal menghapus paket. Pastikan tidak ada langganan aktif yang terikat dengan paket ini.",
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

      {/* SHADCN ALERT NOTIFICATION */}
      {alertMessage && (
        <Alert
          variant={alertMessage.variant === "destructive" ? "destructive" : "default"}
          className="border-border/80 relative flex items-start gap-3 rounded-xl border pr-10">
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
            className="text-muted-foreground hover:text-foreground absolute top-4 right-4 transition-colors">
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
            <TabsList className="border-border/60 h-auto w-full justify-start space-x-6 rounded-none border-b bg-transparent p-0">
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
              {/* TAB BARU: KELOLA PAKET (CRUD) */}
              <TabsTrigger
                value="plans"
                className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-semibold shadow-none transition-all data-[state=active]:bg-transparent">
                {t("tabs.plans")} ({allDbPlans.length})
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

                    {/* Action Buttons: Approve / Reject */}
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
                    <div className="text-right">
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
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span
                        className={`text-lg font-bold ${tx.status === "refunded" ? "text-red-600" : "text-foreground"}`}>
                        {tx.status === "refunded" ? "-" : ""}
                        {formatPrice(tx.amount)}
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

            {/* TAB CONTENT 4: MANAGE PLANS (CRUD) */}
            <TabsContent value="plans" className="mt-0 space-y-4 focus-visible:outline-none">
              {/* Header Bar untuk Membuat Paket Baru */}
              <div className="flex justify-end py-2">
                <Button
                  onClick={openCreatePlanModal}
                  disabled={isProcessingAction !== null}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl px-5 text-xs font-semibold">
                  <Plus className="h-4 w-4" />
                  {t("buttons.createPlan")}
                </Button>
              </div>

              {allDbPlans.length === 0 ? (
                <div className="text-muted-foreground py-10 text-center text-sm">
                  {t("placeholders.noPlans")}
                </div>
              ) : (
                allDbPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border-border/60 bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                      <div className="border-primary/20 bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                        <Package className="text-primary h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground text-sm font-bold">{plan.name}</span>
                          <Badge className="rounded-full text-[9px] font-bold capitalize">
                            {plan.type}
                          </Badge>
                        </div>
                        {/* Render Fitur-fitur dari Array text[] di Database */}
                        {plan.description && plan.description.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1.5">
                            {plan.description.map((feat, fIdx) => (
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

                    {/* Harga, Kapasitas User, & Tombol Edit/Hapus */}
                    <div className="flex shrink-0 items-center justify-between gap-6 border-t pt-3 md:justify-end md:border-t-0 md:pt-0">
                      <div className="text-left md:text-right">
                        <span className="text-foreground text-lg font-extrabold">
                          {formatPrice(plan.price)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          /{plan.type === "yearly" ? "yr" : "mo"}
                        </span>
                        <p className="text-muted-foreground mt-0.5 text-[10px]">
                          {t("placeholders.maxUsers")}:{" "}
                          <strong>
                            {plan.max_users === 9999 ? t("placeholders.unlimited") : plan.max_users}
                          </strong>
                        </p>
                      </div>

                      {/* Aksi CRUD: Edit & Delete */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditPlanModal(plan)}
                          disabled={isProcessingAction !== null}
                          className="text-muted-foreground hover:text-foreground h-9 w-9"
                          title="Edit Plan">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePlan(plan.id, plan.name)}
                          disabled={isProcessingAction !== null}
                          className="text-muted-foreground hover:text-destructive h-9 w-9"
                          title="Delete Plan">
                          {isProcessingAction === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* DIALOG MODAL: CREATE / UPDATE SUBSCRIPTION PLAN */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="border-border/80 rounded-2xl border sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingPlan ? t("dialogPlan.titleEdit") : t("dialogPlan.titleCreate")}
            </DialogTitle>
            <DialogDescription>{t("dialogPlan.desc")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlanSubmit} className="space-y-4 py-3">
            {/* Field 1: Plan Name */}
            <div className="space-y-1.5">
              <Label htmlFor="plan-name" className="text-sm font-semibold">
                {t("dialogPlan.labelName")}
              </Label>
              <Input
                id="plan-name"
                type="text"
                required
                disabled={isProcessingAction !== null}
                value={formPlanName}
                onChange={(e) => setFormPlanName(e.target.value)}
                placeholder="e.g. Starter, Pro, Enterprise"
                className="border-border/80 h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Field 2: Price */}
              <div className="space-y-1.5">
                <Label htmlFor="plan-price" className="text-sm font-semibold">
                  {t("dialogPlan.labelPrice")}
                </Label>
                <Input
                  id="plan-price"
                  type="number"
                  required
                  min={0}
                  disabled={isProcessingAction !== null}
                  value={formPlanPrice}
                  onChange={(e) => setFormPlanPrice(Number(e.target.value))}
                  className="border-border/80 h-10 rounded-xl"
                />
              </div>

              {/* Field 3: Max Users */}
              <div className="space-y-1.5">
                <Label htmlFor="plan-max-users" className="text-sm font-semibold">
                  {t("dialogPlan.labelMaxUsers")}
                </Label>
                <Input
                  id="plan-max-users"
                  type="number"
                  required
                  min={1}
                  disabled={isProcessingAction !== null}
                  value={formPlanMaxUsers}
                  onChange={(e) => setFormPlanMaxUsers(Number(e.target.value))}
                  className="border-border/80 h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Field 4: Billing Cycle Type */}
            <div className="space-y-1.5">
              <Label htmlFor="plan-type" className="text-sm font-semibold">
                {t("dialogPlan.labelType")}
              </Label>
              <Select
                value={formPlanType}
                onValueChange={setFormPlanType}
                disabled={isProcessingAction !== null}>
                <SelectTrigger id="plan-type" className="border-border/80 h-10 rounded-xl">
                  <SelectValue placeholder="Select Cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Field 5: Features List (text[] array input) */}
            <div className="space-y-1.5">
              <Label htmlFor="plan-features" className="text-sm font-semibold">
                {t("dialogPlan.labelFeatures")}
              </Label>
              <Input
                id="plan-features"
                type="text"
                disabled={isProcessingAction !== null}
                value={formPlanFeatures}
                onChange={(e) => setFormPlanFeatures(e.target.value)}
                placeholder={t("placeholders.featuresPlaceholder")}
                className="border-border/80 h-10 rounded-xl text-xs"
              />
            </div>

            {/* Footer Buttons */}
            <DialogFooter className="gap-2 pt-4 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={isProcessingAction !== null}
                onClick={() => setIsPlanModalOpen(false)}
                className="h-10 rounded-xl px-5 text-xs font-semibold">
                {t("buttons.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isProcessingAction !== null}
                className="h-10 rounded-xl px-6 text-xs font-semibold">
                {isProcessingAction === "saving-plan" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("buttons.savePlan")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
