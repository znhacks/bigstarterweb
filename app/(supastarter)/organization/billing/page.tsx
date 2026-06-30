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

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/providers/language-provider";
import { plans, Plan } from "@/config/billing"; // Import berkas konfigurasi statis

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

interface Transaction {
  id: string;
  amount: number;
  plan_name: string;
  order_id: string;
  status: string;
  created_at: string;
}

interface ActiveSubscription {
  id: string;
  planId: string;
  planName: string;
  price: number;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
}

const billingTranslations = {
  English: {
    title: "Your current plan",
    desc: "View your plan details and manage billing.",
    changeTitle: "Change your plan",
    changeDesc: "Compare available plans and switch your subscription.",
    cycles: { monthly: "Monthly", yearly: "Yearly" },
    badges: {
      active: "ACTIVE",
      refundRequested: "REFUND REQUESTED",
      willCancel: "WILL CANCEL",
      freeActive: "FREE ACTIVE"
    },
    subDetails: {
      activeDesc: "Active subscription valued at {price}/month.",
      endsOn: "Premium access ends on",
      renewsOn: "Next automatic renewal on",
      freeDesc: "For testing and hobby use."
    },
    buttons: {
      cancelRenewal: "Cancel Renewal",
      activateRenewal: "Reactivate Renewal",
      claimRefund: "Claim Refund",
      planActive: "Active Plan",
      upgrade: "Upgrade Plan",
      downgrade: "Downgrade Plan",
      choose: "Choose plan",
      cancel: "Cancel",
      confirmRefund: "Yes, Request Refund"
    },
    dialogPurchase: {
      title: "Complete Your Purchase",
      desc: "Complete payment to start using your service plan.",
      details: "Transaction Details",
      currency: "Currency"
    },
    dialogRefund: {
      title: "Claim Refund",
      desc: "Are you sure you want to request a refund for the {planName} plan?",
      warn1:
        "Once submitted, your organization's premium access will be suspended while the review process is underway.",
      warn2:
        "*This review process takes 1-3 business days. Funds will be returned to the PayPal/Credit Card account used for the transaction."
    },
    alerts: {
      successPay:
        "Thank you! Payment for {planName} plan valued at {price} successfully processed. Order ID: {orderId}",
      successCancel: "Automatic renewal disabled. Your premium access remains active until {date}.",
      successResume: "Subscription auto-renewal successfully reactivated.",
      successRefund: "Refund claim successfully submitted and is under review.",
      errorPay: "An error occurred during payment. Please try again.",
      errorDb: "Payment validation failed: {error}"
    }
  },
  "Bahasa Indonesia": {
    title: "Paket aktif Anda",
    desc: "Lihat detail paket Anda dan kelola penagihan.",
    changeTitle: "Ubah paket Anda",
    changeDesc: "Bandingkan paket yang tersedia dan ganti langganan Anda.",
    cycles: { monthly: "Bulanan", yearly: "Tahunan" },
    badges: {
      active: "AKTIF",
      refundRequested: "PENGEMBALIAN DIAJUKAN",
      willCancel: "AKAN BATAL",
      freeActive: "FREE AKTIF"
    },
    subDetails: {
      activeDesc: "Langganan aktif senilai {price}/bulan.",
      endsOn: "Masa aktif premium berakhir pada",
      renewsOn: "Perpanjangan otomatis berikutnya tanggal",
      freeDesc: "Untuk pengujian dan penggunaan hobi."
    },
    buttons: {
      cancelRenewal: "Batalkan Perpanjangan",
      activateRenewal: "Aktifkan Kembali Perpanjangan",
      claimRefund: "Klaim Refund",
      planActive: "Plan Aktif",
      upgrade: "Upgrade Plan",
      downgrade: "Downgrade Plan",
      choose: "Pilih paket",
      cancel: "Batal",
      confirmRefund: "Ya, Ajukan Refund"
    },
    dialogPurchase: {
      title: "Selesaikan Pembelian Anda",
      desc: "Selesaikan pembayaran untuk mulai menggunakan paket layanan Anda.",
      details: "Rincian Transaksi",
      currency: "Mata Uang"
    },
    dialogRefund: {
      title: "Klaim Pengembalian Dana",
      desc: "Apakah Anda yakin ingin mengajukan klaim refund untuk paket {planName}?",
      warn1:
        "Setelah diajukan, akses fitur premium organisasi Anda akan dibekukan sementara sampai proses peninjauan selesai.",
      warn2:
        "*Proses ini membutuhkan waktu peninjauan sekitar 1-3 hari kerja. Dana akan dikirimkan kembali ke akun PayPal/Kartu Kredit Anda."
    },
    alerts: {
      successPay:
        "Terima kasih! Pembayaran paket {planName} senilai {price} berhasil diproses. Order ID: {orderId}",
      successCancel:
        "Masa perpanjangan otomatis telah dimatikan. Durasi akses premium Anda tetap berjalan aktif hingga tanggal {date}.",
      successResume: "Langganan dan perpanjangan otomatis Anda berhasil diaktifkan kembali.",
      successRefund:
        "Klaim pengembalian dana Anda berhasil diajukan dan sedang dalam peninjauan admin.",
      errorPay: "Terjadi kesalahan selama memproses pembayaran. Silakan coba kembali.",
      errorDb: "Validasi pembayaran gagal diproses: {error}"
    }
  }
};

export default function OrganizationBilling() {
  const { language, t, formatPrice } = useLanguage();
  const tBill = billingTranslations[language] || billingTranslations["English"];

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);

  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);

  // State baru untuk transaksi & modal struk
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Perbarui pemanggilan loadBillingData agar memuat riwayat transaksi
  const loadBillingData = async (orgId: string) => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchActiveSubscription(orgId),
        fetchTransactionHistory(orgId) // Ambil riwayat pembayaran
      ]);
    } catch (e: any) {
      console.error("Gagal memuat data billing:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi baru untuk mengambil data transaksi dari tabel 'transactions'
  const fetchTransactionHistory = async (orgId: string) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", orgId)
      .order("created_at", { ascending: false }); // Transaksi terbaru di atas

    if (error) throw error;
    setTransactions(data || []);
  };

  useEffect(() => {
    const orgId = localStorage.getItem("active_org_id");
    if (orgId) {
      setActiveOrgId(orgId);
      loadBillingData(orgId);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchActiveSubscription = async (orgId: string) => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, status, starts_at, ends_at, cancel_at_period_end, plan_id")
      .eq("tenant_id", orgId)
      // Kita juga mencari status 'expired' untuk memastikan riwayat lama terdeteksi
      .in("status", ["active", "refund_requested", "expired"])
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const endsAt = data.ends_at ? new Date(data.ends_at) : null;
      const isExpired = endsAt ? new Date() > endsAt : false;

      // --- LAZY EXPIRATION CLEANUP ---
      if (isExpired && data.status === "active") {
        await supabase.from("subscriptions").update({ status: "expired" }).eq("id", data.id);

        setActiveSub(null);
        return;
      }

      // Jika status memang sudah expired di DB, set activeSub menjadi null
      if (data.status === "expired") {
        setActiveSub(null);
        return;
      }

      const staticPlan = plans.find((p) => p.id === data.plan_id);

      if (staticPlan) {
        setActiveSub({
          id: data.id,
          planId: data.plan_id,
          planName: staticPlan.name,
          price: 0,
          startsAt: data.starts_at,
          endsAt: data.ends_at,
          status: data.status,
          cancelAtPeriodEnd: !!data.cancel_at_period_end
        });
        return;
      }
    }
    setActiveSub(null);
  };

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const handleChoosePlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsCheckoutOpen(true);
  };

  const handleCancelSubscription = async () => {
    if (!activeSub || !activeOrgId) return;
    setIsUpdatingSub(true);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: true })
        .eq("id", activeSub.id);

      if (error) throw error;

      setAlertMessage({
        title: language === "English" ? "Auto-Renewal Disabled" : "Perpanjangan Dinonaktifkan",
        description: tBill.alerts.successCancel.replace(
          "{date}",
          activeSub.endsAt ? new Date(activeSub.endsAt).toLocaleDateString("id-ID") : ""
        ),
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
        title: language === "English" ? "Subscription Resumed" : "Langganan Diaktifkan Kembali",
        description: tBill.alerts.successResume,
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

  const handleClaimRefund = async () => {
    if (!activeSub || !activeOrgId) return;
    setIsUpdatingSub(true);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "refund_requested" })
        .eq("id", activeSub.id);

      if (error) throw error;

      setAlertMessage({
        title: language === "English" ? "Refund Claimed" : "Refund Diajukan",
        description: tBill.alerts.successRefund,
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

  const handlePaymentSuccess = async (details: any) => {
    if (!activeOrgId || !selectedPlan) return;
    setIsVerifyingPayment(true);

    try {
      const response = await fetch("/api/billing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: details.id,
          tenantId: activeOrgId,
          planId: selectedPlan.id,
          billingCycle: billingCycle
        })
      });

      const verificationResult = await response.json();

      if (!response.ok || verificationResult.error) {
        throw new Error(verificationResult.error || "Gagal memverifikasi transaksi.");
      }

      const finalPrice =
        billingCycle === "yearly"
          ? selectedPlan.prices.yearly.amount
          : selectedPlan.prices.monthly.amount;

      setAlertMessage({
        title: language === "English" ? "Payment Successful" : "Pembayaran Berhasil",
        description: tBill.alerts.successPay
          .replace("{planName}", selectedPlan.name)
          .replace("{price}", formatPrice(finalPrice))
          .replace("{orderId}", details.id),
        variant: "default"
      });

      await fetchActiveSubscription(activeOrgId);
    } catch (error: any) {
      console.error("Verification failed:", error);
      setAlertMessage({
        title: "Verification Failed",
        description: tBill.alerts.errorDb.replace("{error}", error?.message || error),
        variant: "destructive"
      });
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Fungsi untuk menghitung sisa nilai uang dari plan aktif saat ini (Prepaid Credit)
  const getRemainingCredit = (): number => {
    if (!activeSub || !activeSub.startsAt || !activeSub.endsAt) return 0;

    const now = new Date().getTime();
    const start = new Date(activeSub.startsAt).getTime();
    const end = new Date(activeSub.endsAt).getTime();

    if (now >= end) return 0; // Sudah kedaluwarsa

    const totalDuration = end - start;
    const remainingTime = end - now;

    // Cari konfigurasi harga asli plan aktif
    const activePlanConfig = plans.find((p) => p.id === activeSub.planId);
    if (!activePlanConfig) return 0;

    const originalPrice =
      billingCycle === "yearly"
        ? activePlanConfig.prices.yearly.amount
        : activePlanConfig.prices.monthly.amount;

    const remainingRatio = remainingTime / totalDuration;
    const credit = remainingRatio * originalPrice;

    return Math.max(0, parseFloat(credit.toFixed(2))); // Bulatkan 2 angka di belakang koma
  };

  // Fungsi untuk menghitung harga final yang harus dibayar saat upgrade
  const getUpgradePrice = (targetPlan: Plan): { finalPrice: number; creditUsed: number } => {
    const targetPrice =
      billingCycle === "yearly"
        ? targetPlan.prices.yearly.amount
        : targetPlan.prices.monthly.amount;
    const credit = getRemainingCredit();

    // Jika harga target lebih murah (bukan upgrade), jangan beri potongan kredit
    const isUpgrade = getPlanActionType(targetPlan.id) === "upgrade";
    if (!isUpgrade) {
      return { finalPrice: targetPrice, creditUsed: 0 };
    }

    const finalPrice = targetPrice - credit;

    // Set minimal charge $1.00 jika potongan kredit melebihi harga plan target (mencegah eror payment gateway)
    return {
      finalPrice: Math.max(1, parseFloat(finalPrice.toFixed(2))),
      creditUsed: credit
    };
  };

  const getPlanActionType = (planId: string) => {
    if (!activeSub || activeSub.status === "refund_requested") return "choose";
    if (activeSub.planId === planId) return "active";

    const planWeights: Record<string, number> = { free: 1, starter: 2, pro: 3 };
    const currentWeight = planWeights[activeSub.planId] || 1;
    const targetWeight = planWeights[planId] || 1;

    return targetWeight > currentWeight ? "upgrade" : "downgrade";
  };

  const isSubActive =
    activeSub &&
    activeSub.status === "active" &&
    (activeSub.endsAt === null || new Date() < new Date(activeSub.endsAt));

  // Hitung sisa hari aktif paket prabayar
  const getDaysLeft = (): number => {
    if (!activeSub || !activeSub.endsAt) return 0;
    const now = new Date().getTime();
    const end = new Date(activeSub.endsAt).getTime();
    const diffTime = end - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Konversi milidetik ke Hari
  };

  const daysLeft = getDaysLeft();
  const showWarningBanner = isSubActive && daysLeft <= 3 && daysLeft > 0;

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

  // Letakkan baris ini di bagian atas sebelum perintah return JSX Anda:
  const activePlanConfig = activeSub ? plans.find((p) => p.id === activeSub.planId) : null;

  const currentActivePrice = activePlanConfig
    ? billingCycle === "yearly"
      ? activePlanConfig.prices.yearly.amount
      : activePlanConfig.prices.monthly.amount
    : 0;

  return (
    <PayPalScriptProvider
      options={{
        "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
        currency: "USD"
      }}>
      <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10">
        {isVerifyingPayment && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            <p className="mt-4 text-sm font-semibold text-white">
              Memverifikasi pembayaran Anda, harap tunggu...
            </p>
          </div>
        )}

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

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">{tBill.title}</h2>
            <p className="text-muted-foreground text-sm">{tBill.desc}</p>
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
                        {tBill.badges.refundRequested}
                      </Badge>
                    ) : isSubActive && activeSub?.cancelAtPeriodEnd ? (
                      <Badge className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-500/15">
                        {tBill.badges.willCancel}
                      </Badge>
                    ) : isSubActive ? (
                      <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/15">
                        {tBill.badges.active}
                      </Badge>
                    ) : (
                      <Badge className="border-muted-foreground/20 bg-muted text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                        {tBill.badges.freeActive}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {activeSub?.status === "refund_requested"
                      ? tBill.subDetails.activeDesc
                      : isSubActive
                        ? `${tBill.subDetails.activeDesc.replace("{price}", formatPrice(activeSub.price))} ${
                            activeSub.endsAt
                              ? `${
                                  activeSub.cancelAtPeriodEnd
                                    ? tBill.subDetails.endsOn
                                    : tBill.subDetails.renewsOn
                                } ${new Date(activeSub.endsAt).toLocaleDateString("id-ID")}`
                              : ""
                          }`
                        : tBill.subDetails.freeDesc}
                  </p>
                </div>

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
                        {tBill.buttons.activateRenewal}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => setIsRefundDialogOpen(true)}
                          disabled={isUpdatingSub}
                          variant="outline"
                          className="border-border/80 inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold">
                          <Undo2 className="h-3.5 w-3.5" />
                          {tBill.buttons.claimRefund}
                        </Button>
                        <Button
                          onClick={handleCancelSubscription}
                          disabled={isUpdatingSub}
                          variant="destructive"
                          className="h-10 rounded-xl px-4 text-xs font-semibold">
                          {isUpdatingSub && <Loader2 className="h-4 w-4 animate-spin" />}
                          {tBill.buttons.cancelRenewal}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-bold tracking-tight">
                  {formatPrice(isSubActive ? currentActivePrice : 0)}
                </span>
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              {tBill.changeTitle}
            </h2>
            <p className="text-muted-foreground text-sm">{tBill.changeDesc}</p>
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
                  {tBill.cycles.monthly}
                </TabsTrigger>
                <TabsTrigger
                  value="yearly"
                  className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2 text-sm font-medium shadow-none transition-all data-[state=active]:bg-transparent">
                  {tBill.cycles.yearly}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-3">
            {plans.map((plan) => {
              const actionType = getPlanActionType(plan.id);
              const isDisabled = activeSub?.status === "refund_requested" || isLoading;
              const planPrice =
                billingCycle === "yearly" ? plan.prices.yearly.amount : plan.prices.monthly.amount;

              if (plan.id === "free") return null; // Tidak perlu render checkout untuk paket gratis di area pembelian

              return (
                <Card
                  key={plan.id}
                  className={`border-border/80 flex h-full flex-col justify-between overflow-visible rounded-2xl border shadow-sm transition-all`}>
                  <CardContent className="flex flex-col gap-6 p-8">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <h3 className="text-2xl font-bold tracking-tight">{plan.name}</h3>
                        <p className="text-muted-foreground min-h-[40px] text-sm">
                          {plan.description}
                        </p>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold tracking-tight">
                          {formatPrice(planPrice)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          / month {billingCycle === "yearly" && " (billed yearly)"}
                        </span>
                      </div>
                    </div>

                    {actionType === "active" && isSubActive ? (
                      <Button
                        disabled
                        className="w-full cursor-default rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-5 font-semibold text-emerald-600 hover:bg-emerald-500/10">
                        {tBill.buttons.planActive}
                      </Button>
                    ) : actionType === "upgrade" && isSubActive ? (
                      <Button
                        onClick={() => handleChoosePlan(plan)}
                        disabled={isDisabled}
                        className="bg-foreground text-background hover:bg-foreground/90 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-5 font-semibold">
                        <ArrowUpRight className="h-4 w-4" />
                        {tBill.buttons.upgrade}
                      </Button>
                    ) : actionType === "downgrade" && isSubActive ? (
                      <div className="w-full space-y-2">
                        <Button
                          disabled
                          variant="outline"
                          className="w-full cursor-not-allowed rounded-xl py-5 font-semibold opacity-60">
                          {tBill.buttons.downgrade}
                        </Button>
                        <p className="text-muted-foreground px-2 text-center text-[10px] leading-normal">
                          *Downgrade can only be processed after your current prepaid plan expires.
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleChoosePlan(plan)}
                        disabled={isDisabled}
                        variant="default"
                        className="bg-foreground text-background hover:bg-foreground/90 w-full rounded-xl py-5 font-semibold">
                        {tBill.buttons.choose}
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

          {/* SECTION 3: TRANSACTION HISTORY & SELF-SERVICE PORTAL */}
          <div className="border-border/60 space-y-4 border-t pt-6">
            <div className="space-y-1">
              <h2 className="text-foreground text-xl font-semibold tracking-tight">
                {language === "English" ? "Billing History" : "Riwayat Pembayaran"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {language === "English"
                  ? "View your past transactions and download official invoices/receipts."
                  : "Lihat transaksi masa lalu Anda dan unduh invoice/kuitansi resmi."}
              </p>
            </div>

            <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-border/60 bg-muted/40 text-muted-foreground border-b text-xs font-semibold tracking-wider uppercase">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Plan Name</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/40 text-foreground/90 divide-y">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-muted-foreground py-10 text-center">
                          {language === "English"
                            ? "No transaction history found."
                            : "Belum ada riwayat transaksi."}
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-medium">
                            {new Date(tx.created_at).toLocaleDateString(
                              language === "English" ? "en-US" : "id-ID",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              }
                            )}
                          </td>
                          <td className="text-muted-foreground px-6 py-4 font-mono text-xs">
                            {tx.order_id}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="font-semibold capitalize">
                              {tx.plan_name}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 font-bold">{formatPrice(tx.amount)}</td>
                          <td className="px-6 py-4">
                            <Badge className="rounded-full border-emerald-500/10 bg-emerald-500/10 font-medium text-emerald-600 hover:bg-emerald-500/15">
                              {tx.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(tx);
                                setIsInvoiceOpen(true);
                              }}
                              className="h-8 rounded-lg text-xs font-semibold">
                              {language === "English" ? "View Invoice" : "Lihat Invoice"}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

        {/* SPANDUK PERINGATAN MASA AKTIF HAMPIR HABIS (GRACEFUL WARNING BANNER) */}
        {showWarningBanner && (
          <Alert className="flex items-start gap-3 rounded-2xl border-amber-500/30 bg-amber-500/10 p-4 text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <AlertTitle className="font-bold text-amber-900">
                {language === "English"
                  ? "Action Required: Plan Expiring Soon!"
                  : "Perhatian: Masa Aktif Paket Hampir Habis!"}
              </AlertTitle>
              <AlertDescription className="text-sm leading-normal text-amber-800/90">
                {language === "English"
                  ? `Your premium prepaid access to the ${activeSub.planName} plan will expire in ${daysLeft} day(s). Renew or upgrade today to avoid interruption to your workflow.`
                  : `Masa aktif akses premium paket ${activeSub.planName} Anda akan berakhir dalam ${daysLeft} hari lagi. Lakukan pembelian ulang atau upgrade hari ini agar alur kerja Anda tidak terganggu.`}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* DIALOG MODAL DETAIL INVOICE (PRINT-FRIENDLY RECPT) */}
        <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
          <DialogContent className="border-border/80 max-h-[90vh] overflow-y-auto rounded-2xl border p-8 sm:max-w-[550px]">
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Konten yang akan dicetak */}
                <div id="printable-invoice" className="space-y-6 print:p-0">
                  <div className="border-border/80 flex items-start justify-between border-b pb-6">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">INVOICE RECEIPT</h2>
                      <p className="text-muted-foreground mt-1 font-mono text-xs">
                        ID: #{selectedInvoice.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <h3 className="text-sm font-bold">PREPAID SERVICE</h3>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Date: {new Date(selectedInvoice.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground font-semibold tracking-wider uppercase">
                        Billed To:
                      </p>
                      <p className="mt-1 text-sm font-bold">Organization ID</p>
                      <p className="text-muted-foreground mt-0.5 font-mono">
                        {selectedInvoice.tenant_id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground font-semibold tracking-wider uppercase">
                        Payment Method:
                      </p>
                      <p className="mt-1 text-sm font-bold">PayPal Checkout</p>
                      <p className="text-muted-foreground mt-0.5">
                        Ref ID: {selectedInvoice.order_id.slice(0, 15)}...
                      </p>
                    </div>
                  </div>

                  <div className="border-border/60 mt-4 overflow-hidden rounded-xl border">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-border/60 text-muted-foreground border-b font-semibold uppercase">
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-border/40 text-foreground/90 divide-y">
                        <tr>
                          <td className="px-4 py-4">
                            <p className="font-bold capitalize">
                              {selectedInvoice.plan_name} Plan Access
                            </p>
                            <p className="text-muted-foreground mt-1 text-[11px]">
                              Prepaid SaaS premium feature access.
                            </p>
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-bold">
                            {formatPrice(selectedInvoice.amount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-muted/30 border-border/40 flex items-center justify-between rounded-xl border p-4 text-sm font-bold">
                    <span>Total Paid (USD)</span>
                    <span className="text-lg">{formatPrice(selectedInvoice.amount)}</span>
                  </div>

                  <div className="text-muted-foreground border-border/40 border-t pt-4 text-center text-[10px]">
                    Thank you for your purchase! This is an official digital receipt for your
                    prepaid service.
                  </div>
                </div>

                {/* Action Buttons */}
                <DialogFooter className="border-border/60 gap-2 border-t pt-4 sm:gap-0 print:hidden">
                  <Button
                    variant="outline"
                    onClick={() => setIsInvoiceOpen(false)}
                    className="rounded-xl">
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      window.print(); // Membuka sistem cetak printer/save PDF bawaan browser
                    }}
                    className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-1.5 rounded-xl">
                    Print / Save PDF
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="border-border/80 rounded-2xl border sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{tBill.dialogPurchase.title}</DialogTitle>
              <DialogDescription>{tBill.dialogPurchase.desc}</DialogDescription>
            </DialogHeader>

            {selectedPlan &&
              (() => {
                const { finalPrice, creditUsed } = getUpgradePrice(selectedPlan);
                const isUpgrade = getPlanActionType(selectedPlan.id) === "upgrade";

                return (
                  <div className="space-y-6 py-4">
                    {/* Rincian Transaksi dengan Prorasi */}
                    <div className="bg-muted/50 border-border/60 space-y-2 rounded-xl border p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium">
                          {selectedPlan.name} Plan ({billingCycle})
                        </span>
                        <span className="text-foreground font-semibold">
                          {formatPrice(
                            billingCycle === "yearly"
                              ? selectedPlan.prices.yearly.amount
                              : selectedPlan.prices.monthly.amount
                          )}
                        </span>
                      </div>

                      {/* Informasikan Kredit Sisa Jika Ini Proses Upgrade */}
                      {isUpgrade && creditUsed > 0 && (
                        <div className="flex items-center justify-between text-xs font-medium text-emerald-600">
                          <span>Prepaid Credit Applied (Sisa Sisa Paket)</span>
                          <span>-{formatPrice(creditUsed)}</span>
                        </div>
                      )}

                      <div className="border-border/60 text-foreground flex items-center justify-between border-t pt-2 text-base font-bold">
                        <span>Amount to Pay</span>
                        <span>{formatPrice(finalPrice)}</span>
                      </div>

                      {billingCycle === "yearly" && (
                        <div className="text-muted-foreground text-right text-[10px] italic">
                          Billed annually
                        </div>
                      )}
                    </div>

                    {/* Tombol Pembayaran PayPal dengan nominal yang sudah dipotong (finalPrice) */}
                    <div className="min-h-[150px] space-y-3">
                      <PayPalButtons
                        style={{ layout: "vertical", shape: "rect", label: "pay" }}
                        createOrder={(data, actions) => {
                          return actions.order.create({
                            intent: "CAPTURE",
                            purchase_units: [
                              {
                                description: `PREPAID:${selectedPlan.id}:${billingCycle}`,
                                custom_id: activeOrgId || undefined,
                                amount: {
                                  currency_code: "USD",
                                  value: finalPrice.toString() // Menggunakan harga terpotong prorasi
                                }
                              }
                            ]
                          });
                        }}
                        onApprove={async (data, actions) => {
                          if (actions.order) {
                            const details = await actions.order.capture();
                            await handlePaymentSuccess(details);
                            setIsCheckoutOpen(false);
                          }
                        }}
                        onError={(err) => {
                          setAlertMessage({
                            title: "Payment Failed",
                            description:
                              "Terjadi kesalahan selama memproses pembayaran. Silakan coba kembali.",
                            variant: "destructive"
                          });
                          setIsCheckoutOpen(false);
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
          </DialogContent>
        </Dialog>

        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
          <DialogContent className="border-border/80 rounded-2xl border sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{tBill.dialogRefund.title}</DialogTitle>
              <DialogDescription>
                {tBill.dialogRefund.desc.replace("{planName}", activeSub?.planName || "")}
              </DialogDescription>
            </DialogHeader>

            <div className="text-muted-foreground space-y-4 py-3 text-sm leading-relaxed">
              <p>{tBill.dialogRefund.warn1}</p>
              <p className="rounded-xl border border-dashed border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-500">
                {tBill.dialogRefund.warn2}
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                disabled={isUpdatingSub}
                onClick={() => setIsRefundDialogOpen(false)}
                className="rounded-xl">
                {tBill.buttons.cancel}
              </Button>
              <Button
                onClick={handleClaimRefund}
                disabled={isUpdatingSub}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 text-white hover:bg-red-800">
                {isUpdatingSub && <Loader2 className="h-4 w-4 animate-spin" />}
                {tBill.buttons.confirmRefund}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PayPalScriptProvider>
  );
}
