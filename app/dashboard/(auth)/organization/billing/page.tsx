"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Check,
  X,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  ArrowDown,
  RefreshCw,
  Undo2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

// Impor komponen PayPal & Klien Supabase
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/providers/language-provider";

interface Plan {
  id: string; // Menggunakan UUID dari tabel public.plans
  name: string;
  desc: string;
  price: number;
  max_users: number;
  buttonVariant: "secondary" | "default";
  buttonClass: string;
  features: string[];
  recommended?: boolean;
}

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

interface ActiveSubscription {
  id: string;
  planId: string;
  planName: string;
  price: number;
  endsAt: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
}

// Token Desain / Detail Representatif Tambahan untuk mencocokkan baris data Supabase
const planDesignTokens: Record<
  string,
  { desc: string; features: string[]; recommended?: boolean }
> = {
  Starter: {
    desc: "For projects moving into production.",
    features: [
      "2,000 screenshots per month",
      "40 requests per minute",
      "PNG, JPEG, WebP, PDF, and more",
      "Full page screenshots",
      "Block cookie banners, chat widgets, and ads",
      "Caching",
      "Upload to S3-compatible storage",
      "Choose IP location",
      "No attribution link required"
    ]
  },
  Pro: {
    desc: "For production workloads at higher volume.",
    recommended: true,
    features: [
      "10,000 screenshots per month",
      "80 requests per minute",
      "PNG, JPEG, WebP, PDF, and more",
      "Full page screenshots",
      "Block cookie banners, chat widgets, and ads",
      "Caching",
      "Upload to S3-compatible storage",
      "Choose IP location",
      "No attribution link required"
    ]
  },
  Enterprise: {
    desc: "For large-scale deployments and custom requirements.",
    features: [
      "50,000 screenshots per month",
      "160 requests per minute",
      "PNG, JPEG, WebP, PDF, and more",
      "Full page screenshots",
      "Block cookie banners, chat widgets, and ads",
      "Caching",
      "Upload to S3-compatible storage",
      "Choose IP location",
      "No attribution link required"
    ]
  }
};

export default function OrganizationBilling() {
  const { t, formatPrice } = useLanguage();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);

  // State Dinamis dari Database Supabase
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

  // State Modal PayPal & Modal Refund
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);

  useEffect(() => {
    const orgId = localStorage.getItem("active_org_id");
    if (orgId) {
      setActiveOrgId(orgId);
      loadBillingData(orgId);
    } else {
      setIsLoading(false);
    }
  }, [billingCycle]);

  // Memuat seluruh data paket & langganan aktif langsung dari tabel database Supabase
  const loadBillingData = async (orgId: string) => {
    setIsLoading(true);
    try {
      await Promise.all([fetchPlansFromDatabase(), fetchActiveSubscription(orgId)]);
    } catch (e: any) {
      console.error("Gagal memuat data billing:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Ambil daftar paket langsung dari tabel public.plans
  const fetchPlansFromDatabase = async () => {
    const { data, error } = await supabase.from("plans").select("*").eq("type", billingCycle);

    if (error) throw error;

    if (data) {
      const formatted: Plan[] = data.map((dbPlan: any) => {
        const design = planDesignTokens[dbPlan.name] || {
          desc: "Custom organization plan.",
          features: []
        };
        return {
          id: dbPlan.id,
          name: dbPlan.name,
          desc: design.desc,
          price: dbPlan.price,
          max_users: dbPlan.max_users,
          buttonVariant: dbPlan.name === "Pro" ? "default" : "secondary",
          buttonClass:
            dbPlan.name === "Pro"
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-secondary text-foreground hover:bg-secondary/80",
          features: design.features,
          recommended: !!design.recommended
        };
      });
      setPlans(formatted);
    }
  };

  // 2. Ambil data langganan aktif dari tabel public.subscriptions
  const fetchActiveSubscription = async (orgId: string) => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        `
        id,
        status,
        ends_at,
        cancel_at_period_end,
        plan_id,
        plans (
          name,
          price
        )
      `
      )
      .eq("tenant_id", orgId)
      .in("status", ["active", "refund_requested"])
      .maybeSingle();

    if (error) throw error;

    if (data && data.plans) {
      const planInfo = data.plans as any;
      setActiveSub({
        id: data.id,
        planId: data.plan_id,
        planName: planInfo.name,
        price: planInfo.price,
        endsAt: data.ends_at,
        status: data.status,
        cancelAtPeriodEnd: !!data.cancel_at_period_end
      });
    } else {
      setActiveSub(null);
    }
  };

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const getFinalPrice = (pricePerMonth: number) => {
    return billingCycle === "yearly" ? pricePerMonth * 12 : pricePerMonth;
  };

  const handleChoosePlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsCheckoutOpen(true);
  };

  // 1. PEMBATALAN BERTAHAP (Masa Tenggang berjalan hingga tanggal ends_at)
  const handleCancelSubscription = async () => {
    if (!activeSub || !activeOrgId) return;
    setIsUpdatingSub(true);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: true }) // Matikan perpanjangan, status tetap 'active'
        .eq("id", activeSub.id);

      if (error) throw error;

      setAlertMessage({
        title: "Perpanjangan Dinonaktifkan",
        description: `Masa perpanjangan otomatis telah dimatikan. Durasi akses premium Anda tetap berjalan aktif hingga tanggal masa tenggat pada ${
          activeSub.endsAt ? new Date(activeSub.endsAt).toLocaleDateString("id-ID") : ""
        }.`,
        variant: "default"
      });

      await fetchActiveSubscription(activeOrgId);
    } catch (e: any) {
      setAlertMessage({
        title: "Failed to Cancel",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingSub(false);
    }
  };

  // 2. AKTIFKAN KEMBALI perpanjangan langganan sebelum tenggat berakhir
  const handleResumeSubscription = async () => {
    if (!activeSub || !activeOrgId) return;
    setIsUpdatingSub(true);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: false })
        .eq("id", activeSub.id);

      if (error) throw error;

      setAlertMessage({
        title: "Subscription Resumed",
        description: "Langganan dan perpanjangan otomatis Anda berhasil diaktifkan kembali.",
        variant: "default"
      });

      await fetchActiveSubscription(activeOrgId);
    } catch (e: any) {
      setAlertMessage({
        title: "Failed to Resume",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingSub(false);
    }
  };

  // 3. PENGAJUAN KLAIM REFUND (Akses premium langsung dibekukan)
  const handleClaimRefund = async () => {
    if (!activeSub || !activeOrgId) return;
    setIsUpdatingSub(true);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "refund_requested" }) // Set status ke pengajuan refund
        .eq("id", activeSub.id);

      if (error) throw error;

      setAlertMessage({
        title: "Refund Claimed",
        description:
          "Pengajuan pengembalian dana berhasil dikirim dan sedang dalam peninjauan admin.",
        variant: "default"
      });

      setIsRefundDialogOpen(false);
      await fetchActiveSubscription(activeOrgId);
    } catch (e: any) {
      setAlertMessage({ title: "Refund Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsUpdatingSub(false);
    }
  };

  // Pemrosesan Database setelah Pembayaran PayPal sukses
  const handlePaymentSuccess = async (details: any) => {
    if (!activeOrgId || !selectedPlan || !selectedPlan.id) return;

    const finalAmount = getFinalPrice(selectedPlan.price);

    try {
      // 1. Simpan transaksi baru ke dalam tabel 'transactions'
      const { error: txError } = await supabase.from("transactions").insert({
        tenant_id: activeOrgId,
        amount: finalAmount,
        plan_name: selectedPlan.name,
        order_id: details.id,
        status: "completed"
      });

      if (txError) throw txError;

      // 2. Kalkulasi Tanggal Berakhir
      const endsAt = new Date();
      if (billingCycle === "yearly") {
        endsAt.setFullYear(endsAt.getFullYear() + 1);
      } else {
        endsAt.setMonth(endsAt.getMonth() + 1);
      }

      // 3. Update atau Insert data langganan di tabel 'subscriptions'
      const { error: subError } = await supabase.from("subscriptions").upsert(
        {
          tenant_id: activeOrgId,
          plan_id: selectedPlan.id,
          status: "active",
          cancel_at_period_end: false,
          starts_at: new Date().toISOString(),
          ends_at: endsAt.toISOString()
        },
        { onConflict: "tenant_id" }
      );

      if (subError) throw subError;

      setAlertMessage({
        title: "Payment Successful",
        description: `Terima kasih! Pembayaran paket ${selectedPlan.name} senilai $${finalAmount} berhasil diproses. Order ID: ${details.id}`,
        variant: "default"
      });

      await fetchActiveSubscription(activeOrgId);
    } catch (error: any) {
      console.error("Gagal mengupdate database transaksi:", error);
      setAlertMessage({
        title: "Database Sync Failed",
        description: `Pembayaran sukses, namun gagal mencatat data ke database: ${error?.message || error}`,
        variant: "destructive"
      });
    }
  };

  // Menentukan jenis tombol aksi paket
  const getPlanActionType = (planName: string) => {
    if (!activeSub || activeSub.status === "refund_requested") return "choose";
    if (activeSub.planName === planName) return "active";

    const planWeights: Record<string, number> = { Starter: 1, Pro: 2, Enterprise: 3 };
    const currentWeight = planWeights[activeSub.planName] || 0;
    const targetWeight = planWeights[planName] || 0;

    return targetWeight > currentWeight ? "upgrade" : "downgrade";
  };

  // Verifikasi keaktifan sesi langganan saat ini berdasarkan tanggal jatuh tempo
  const isSubActive =
    activeSub &&
    activeSub.status === "active" &&
    (activeSub.endsAt === null || new Date() < new Date(activeSub.endsAt));

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeOrgId) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Active Organization</AlertTitle>
          <AlertDescription>
            Silakan pilih organisasi terlebih dahulu di sidebar kiri sebelum mengelola billing
            tagihan.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={{ "client-id": "test", currency: t.currency.code }}>
      <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10">
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

        {/* SECTION 1: YOUR CURRENT PLAN */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              Your current plan
            </h2>
            <p className="text-muted-foreground text-sm">
              View your plan details and manage billing.
            </p>
          </div>

          <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
            <CardContent className="space-y-6 p-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-2xl font-bold tracking-tight">
                      {isSubActive ? activeSub.planName : "Free"}
                    </h3>

                    {activeSub?.status === "refund_requested" ? (
                      <Badge className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/15">
                        REFUND REQUESTED
                      </Badge>
                    ) : isSubActive && activeSub?.cancelAtPeriodEnd ? (
                      <Badge className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-500/15">
                        WILL CANCEL
                      </Badge>
                    ) : isSubActive ? (
                      <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/15">
                        ACTIVE
                      </Badge>
                    ) : (
                      <Badge className="border-muted-foreground/20 bg-muted text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                        FREE ACTIVE
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {activeSub?.status === "refund_requested"
                      ? "Klaim pengembalian dana Anda sedang dalam peninjauan Admin. Akses premium dibekukan sementara."
                      : isSubActive
                        ? `Langganan aktif senilai ${formatPrice(activeSub.price)}/bulan. ${
                            activeSub.endsAt
                              ? `${
                                  activeSub.cancelAtPeriodEnd
                                    ? "Masa aktif premium berjalan akan berakhir pada"
                                    : "Perpanjangan otomatis berikutnya tanggal"
                                } ${new Date(activeSub.endsAt).toLocaleDateString("id-ID")}`
                              : ""
                          }`
                        : "For testing and hobby use."}
                  </p>
                </div>

                {/* MANAJEMEN ACTION BUTTONS UNTUK STRUKTUR PEMBATALAN GRACEFUL / REFUND */}
                {isSubActive && (
                  <div className="flex shrink-0 flex-wrap gap-3">
                    {activeSub.cancelAtPeriodEnd ? (
                      <Button
                        onClick={handleResumeSubscription}
                        disabled={isUpdatingSub}
                        variant="outline"
                        className="border-border/80 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold">
                        {isUpdatingSub ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Aktifkan Kembali Perpanjangan
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => setIsRefundDialogOpen(true)}
                          disabled={isUpdatingSub}
                          variant="outline"
                          className="border-border/80 inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold">
                          <Undo2 className="h-3.5 w-3.5" />
                          Klaim Refund
                        </Button>
                        <Button
                          onClick={handleCancelSubscription}
                          disabled={isUpdatingSub}
                          variant="destructive"
                          className="h-10 rounded-xl px-4 text-xs font-semibold">
                          {isUpdatingSub && <Loader2 className="h-4 w-4 animate-spin" />}
                          Batalkan Perpanjangan
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Rincian Fitur Dinamis berdasarkan Plan Aktif */}
              <ul className="text-foreground/90 max-w-2xl space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    {isSubActive && activeSub?.planName === "Enterprise"
                      ? "50,000"
                      : isSubActive && activeSub?.planName === "Pro"
                        ? "10,000"
                        : isSubActive && activeSub?.planName === "Starter"
                          ? "2,000"
                          : "200"}{" "}
                    screenshots per month
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    {isSubActive && activeSub?.planName === "Enterprise"
                      ? "160"
                      : isSubActive && activeSub?.planName === "Pro"
                        ? "80"
                        : isSubActive && activeSub?.planName === "Starter"
                          ? "40"
                          : "20"}{" "}
                    requests per minute
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>PNG, JPEG, WebP, PDF, and more</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Full page screenshots</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Block cookie banners, chat widgets, and ads</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Caching</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Upload to S3-compatible storage</span>
                </li>

                {!isSubActive ? (
                  <>
                    <li className="text-muted-foreground/70 flex items-start gap-3">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <span>Choose IP location</span>
                    </li>
                    <li className="text-muted-foreground/70 flex items-start gap-3">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <span>Attribution link required when used in production</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>Choose IP location</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>No attribution link required</span>
                    </li>
                  </>
                )}
              </ul>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-bold tracking-tight">
                  ${isSubActive ? activeSub.price : "0"}
                </span>
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: CHANGE YOUR PLAN */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              Change your plan
            </h2>
            <p className="text-muted-foreground text-sm">
              Compare available plans and switch your subscription.
            </p>
          </div>

          <div className="flex justify-center">
            <Tabs
              value={billingCycle}
              onValueChange={(val) => setBillingCycle(val as "monthly" | "yearly")}
              className="w-auto">
              <TabsList className="border-border/60 h-auto w-full justify-center space-x-6 rounded-none border-b bg-transparent p-0">
                <TabsTrigger
                  value="monthly"
                  className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2 text-sm font-medium shadow-none transition-all data-[state=active]:bg-transparent">
                  Monthly
                </TabsTrigger>
                <TabsTrigger
                  value="yearly"
                  className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2 text-sm font-medium shadow-none transition-all data-[state=active]:bg-transparent">
                  Yearly
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-3">
            {plans.map((plan) => {
              const actionType = getPlanActionType(plan.name);
              const isDisabled = activeSub?.status === "refund_requested" || isLoading;

              return (
                <Card
                  key={plan.name}
                  className={`flex h-full flex-col justify-between overflow-visible rounded-2xl transition-all ${
                    plan.recommended
                      ? "border-foreground relative border-2 shadow-md"
                      : "border-border/80 border shadow-sm"
                  }`}>
                  {plan.recommended && (
                    <div className="bg-foreground text-background absolute top-0 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider uppercase shadow-sm">
                      <Star className="fill-background h-3.5 w-3.5" />
                      Recommended
                    </div>
                  )}

                  <CardContent
                    className={`flex flex-col gap-6 p-8 ${plan.recommended ? "pt-10" : ""}`}>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <h3 className="text-2xl font-bold tracking-tight">{plan.name}</h3>
                        <p className="text-muted-foreground min-h-[40px] text-sm">{plan.desc}</p>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold tracking-tight">
                          {formatPrice(plan.price)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          / month {billingCycle === "yearly" && " (billed yearly)"}
                        </span>
                      </div>
                    </div>

                    {/* ACTION BUTTONS (UPGRADE/DOWNGRADE) */}
                    {actionType === "active" && isSubActive ? (
                      <Button
                        disabled
                        className="w-full cursor-default rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-5 font-semibold text-emerald-600 hover:bg-emerald-500/10">
                        Plan Aktif
                      </Button>
                    ) : actionType === "upgrade" && isSubActive ? (
                      <Button
                        onClick={() => handleChoosePlan(plan)}
                        disabled={isDisabled}
                        className="bg-foreground text-background hover:bg-foreground/90 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-5 font-semibold">
                        <ArrowUpRight className="h-4 w-4" />
                        Upgrade Plan
                      </Button>
                    ) : actionType === "downgrade" && isSubActive ? (
                      <Button
                        onClick={() => handleChoosePlan(plan)}
                        disabled={isDisabled}
                        variant="outline"
                        className="border-border/80 hover:bg-accent inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-5 font-semibold">
                        <ArrowDown className="h-4 w-4" />
                        Downgrade Plan
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleChoosePlan(plan)}
                        disabled={isDisabled}
                        variant={plan.buttonVariant}
                        className={`w-full rounded-xl py-5 font-semibold ${plan.buttonClass}`}>
                        Choose plan
                      </Button>
                    )}

                    <div className="space-y-3 pt-2">
                      <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
                        Key features:
                      </h4>
                      <ul className="text-foreground/90 space-y-2.5 text-sm">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <Check className="text-foreground/75 mt-0.5 h-4 w-4 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* DIALOG MODAL CHECKOUT PAYPAL */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="border-border/80 rounded-2xl border sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Complete Your Purchase</DialogTitle>
              <DialogDescription>
                Selesaikan pembayaran untuk mulai menggunakan paket layanan Anda.
              </DialogDescription>
            </DialogHeader>

            {selectedPlan && (
              <div className="space-y-6 py-4">
                {/* Rincian Transaksi */}
                <div className="bg-muted/50 border-border/60 space-y-2 rounded-xl border p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium">
                      {selectedPlan.name} Plan ({billingCycle})
                    </span>
                    <span className="text-foreground font-bold">
                      ${getFinalPrice(selectedPlan.price)}.00
                    </span>
                  </div>
                  {billingCycle === "yearly" && (
                    <div className="text-muted-foreground text-right text-[11px] italic">
                      Billed annually (${selectedPlan.price}/month × 12)
                    </div>
                  )}
                  <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
                    <span>Currency</span>
                    <span>USD</span>
                  </div>
                </div>

                {/* Tombol PayPal Sandbox */}
                <div className="min-h-[150px] space-y-3">
                  <PayPalButtons
                    style={{ layout: "vertical", shape: "rect", label: "pay" }}
                    createOrder={(data, actions) => {
                      const finalPrice = getFinalPrice(selectedPlan.price);

                      return actions.order.create({
                        intent: "CAPTURE",
                        purchase_units: [
                          {
                            description: `Subscription to ${selectedPlan.name} Plan (${billingCycle} billing)`,
                            amount: {
                              currency_code: "USD",
                              value: finalPrice.toString()
                            }
                          }
                        ]
                      });
                    }}
                    onApprove={async (data, actions) => {
                      if (actions.order) {
                        const details = await actions.order.capture();

                        // Jalankan fungsi integrasi database setelah pembayaran sukses
                        await handlePaymentSuccess(details);

                        setIsCheckoutOpen(false);
                      }
                    }}
                    onError={(err) => {
                      setAlertMessage({
                        title: "Payment Failed",
                        description:
                          "Terjadi kesalahan selama memproses pembayaran PayPal. Silakan coba kembali.",
                        variant: "destructive"
                      });
                      setIsCheckoutOpen(false);
                    }}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* DIALOG MODAL KONFIRMASI KLAIM REFUND */}
        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
          <DialogContent className="border-border/80 rounded-2xl border sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Klaim Pengembalian Dana</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin mengajukan klaim refund untuk paket **{activeSub?.planName}
                **?
              </DialogDescription>
            </DialogHeader>

            <div className="text-muted-foreground space-y-4 py-3 text-sm leading-relaxed">
              <p>
                Setelah pengajuan diajukan, akses fitur premium organisasi Anda akan **dibekukan**
                sementara sampai proses peninjauan selesai dilakukan oleh admin.
              </p>
              <p className="rounded-xl border border-dashed border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-500">
                *Proses ini membutuhkan waktu peninjauan sekitar 1-3 hari kerja. Dana akan
                dikirimkan kembali ke akun PayPal/Kartu Kredit Anda yang digunakan saat
                bertransaksi.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                disabled={isUpdatingSub}
                onClick={() => setIsRefundDialogOpen(false)}
                className="rounded-xl">
                Batal
              </Button>
              <Button
                onClick={handleClaimRefund}
                disabled={isUpdatingSub}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 text-white hover:bg-red-800">
                {isUpdatingSub && <Loader2 className="h-4 w-4 animate-spin" />}
                Ya, Ajukan Refund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PayPalScriptProvider>
  );
}
