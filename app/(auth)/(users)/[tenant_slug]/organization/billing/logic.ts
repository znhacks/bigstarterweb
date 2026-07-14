// app/(auth)/(users)/[tenant_slug]/organization/billing/logic.ts
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation"; 
import { supabase } from "@/lib/supabase";
import { plans, Plan, GatewayIds } from "@/config/billing";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/i18n/currency";
import { convertCurrency } from "@/actions/currency";
import { getDisplayCurrency } from "@/config/i18n-culture";

export interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export interface Transaction {
  id: string;
  tenant_id: string;
  amount: number;
  currency?: string | null;
  amount_in_idr?: number | null;
  plan_name: string;
  order_id: string;
  status: string;
  created_at: string;
  provider?: string;
}

export interface ActiveSubscription {
  id: string;
  planId: string;
  planName: string;
  price: number;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  provider?: string;
  pendingPlanId?: string; 
}

export interface ConvertedPlan extends Omit<Plan, "prices"> {
  features: string[];
  prices: {
    monthly: {
      amount: number;
      convertedAmount: number;
      providers?: GatewayIds;
    };
    yearly: {
      amount: number;
      convertedAmount: number;
      providers?: GatewayIds;
    };
  };
}

export function useOrganizationBilling() {
  const locale = useLocale();
  const routeParams = useParams(); 
  const tenantSlug = (routeParams?.tenant_slug as string) || "";

  const t = useTranslations("organization.organization-billing");
  const targetCurrency = getDisplayCurrency(locale);

  const formatPrice = (price: number, currencyCode?: string) => {
    const activeCurrency = currencyCode ?? targetCurrency;
    return formatCurrency(price, locale, {
      currencyCode: activeCurrency
    });
  };

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const [enabledProviders, setEnabledProviders] = useState<string[]>([]);

  const [convertedPlans, setConvertedPlans] = useState<ConvertedPlan[]>(() =>
    plans.map((p) => ({
      ...p,
      features: p.displayFeatures || [],
      prices: {
        monthly: { ...p.prices.monthly, convertedAmount: p.prices.monthly.amount },
        yearly: { ...p.prices.yearly, convertedAmount: p.prices.yearly.amount }
      }
    }))
  );

  const [selectedPlan, setSelectedPlan] = useState<ConvertedPlan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: string; value: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const initializeConvertedPlans = async () => {
    try {
      const updated = await Promise.all(
        plans.map(async (plan) => {
          const monthlyConv = await convertCurrency(plan.prices.monthly.amount, targetCurrency);
          const yearlyConv = await convertCurrency(plan.prices.yearly.amount, targetCurrency);
          return {
            ...plan,
            features: plan.displayFeatures || [],
            prices: {
              monthly: {
                ...plan.prices.monthly,
                convertedAmount: monthlyConv.amount
              },
              yearly: {
                ...plan.prices.yearly,
                convertedAmount: yearlyConv.amount
              }
            }
          };
        })
      );
      setConvertedPlans(updated);
    } catch (err) {
      console.error("Gagal mengonversi harga paket:", err);
    }
  };

  const loadBillingData = async (orgId: string) => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchActiveSubscription(orgId),
        fetchTransactionHistory(orgId),
        initializeConvertedPlans()
      ]);
    } catch (e: any) {
      console.error("================ BILLING ERROR ================");
      console.error("Message :", e?.message || e);
      if (e?.code) console.error("Code    :", e.code);
      if (e?.details) console.error("Details :", e.details);
      if (e?.hint) console.error("Hint    :", e.hint);
      if (e?.stack) console.error("Stack   :", e.stack);
      console.error("===============================================");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactionHistory = async (orgId: string) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setTransactions(data || []);
  };

  const fetchActiveSubscription = async (orgId: string) => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "id, status, starts_at, ends_at, cancel_at_period_end, plan_id, provider, pending_plan_id"
      )
      .eq("tenant_id", orgId)
      .in("status", [
        "active",
        "ACTIVE",
        "refund_requested",
        "REFUND_REQUESTED",
        "expired",
        "EXPIRED"
      ])
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const endsAt = data.ends_at ? new Date(data.ends_at) : null;
      const isExpired = endsAt ? new Date() > endsAt : false;

      if (isExpired && data.status === "active") {
        await supabase.from("subscriptions").update({ status: "expired" }).eq("id", data.id);
        setActiveSub(null);
        return;
      }

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
          cancelAtPeriodEnd: !!data.cancel_at_period_end,
          provider: data.provider || undefined,
          pendingPlanId: data.pending_plan_id || undefined
        });
        return;
      }
    }
    setActiveSub(null);
  };

  useEffect(() => {
    const orgId = localStorage.getItem("active_org_id");

    const providersEnv = process.env.NEXT_PUBLIC_ENABLED_PAYMENT_PROVIDERS;
    if (providersEnv) {
      setEnabledProviders(providersEnv.split(",").map((p) => p.trim().toLowerCase()));
    } else {
      setEnabledProviders(["mayar"]);
    }

    if (orgId) {
      setActiveOrgId(orgId);
      loadBillingData(orgId);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeOrgId) return;

    const params = new URLSearchParams(window.location.search);
    const hasSuccess = params.get("success") === "true";
    const hasCanceled = params.get("canceled") === "true";

    if (hasSuccess) {
      setAlertMessage({
        title: locale === "en" ? "Payment Processing" : "Pembayaran Sedang Diproses",
        description:
          "Terima kasih! Transaksi Anda sedang diverifikasi secara aman oleh sistem di latar belakang. Mohon tunggu beberapa detik selagi kami memperbarui status akun Anda.",
        variant: "default"
      });

      const timer = setTimeout(() => {
        fetchActiveSubscription(activeOrgId);
        fetchTransactionHistory(activeOrgId);
      }, 4000);

      window.history.replaceState({}, document.title, window.location.pathname);

      return () => clearTimeout(timer);
    } else if (hasCanceled) {
      setAlertMessage({
        title: locale === "en" ? "Checkout Canceled" : "Pembayaran Dibatalkan",
        description:
          "Anda membatalkan proses transaksi pembayaran. Silakan coba kembali saat Anda sudah siap.",
        variant: "destructive"
      });

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [activeOrgId, locale]);

  const handleChoosePlan = (plan: ConvertedPlan) => {
    setSelectedPlan(plan);
    setIsCheckoutOpen(true);
  };

  // FUNGSI UNIFIED CHECKOUT: Sudah disatukan penuh & menyertakan appliedCoupon (Bebas Duplikasi)
  const handleInitiateCheckout = async (provider: string) => {
    if (!activeOrgId || !selectedPlan || !tenantSlug) return;
    setIsVerifyingPayment(true);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) throw new Error("Silakan masuk terlebih dahulu");

      const billingRedirectPath = `/${tenantSlug}/organization/billing`;

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          interval: billingCycle,
          provider: provider,
          tenantId: activeOrgId,
          couponCode: appliedCoupon?.code || undefined, // Mengirimkan kupon diskon aktif
          successUrl: `${window.location.origin}${billingRedirectPath}?success=true`,
          cancelUrl: `${window.location.origin}${billingRedirectPath}?canceled=true`
        })
      });

      const checkoutSession = await response.json();
      if (!response.ok || checkoutSession.error) {
        throw new Error(checkoutSession.error || "Gagal menginisiasi checkout.");
      }

      if (checkoutSession.checkoutUrl) {
        window.location.href = checkoutSession.checkoutUrl;
      }
    } catch (error: any) {
      console.error("Checkout failed:", error);
      setAlertMessage({
        title: "Checkout Failed",
        description: error?.message || "Koneksi ke gateway pembayaran terputus.",
        variant: "destructive"
      });
      setIsCheckoutOpen(false);
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!activeSub || !activeOrgId) return;
    setIsUpdatingSub(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Silakan masuk terlebih dahulu");

      const response = await fetch(`/api/billing/cancel-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tenantId: activeOrgId })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal membatalkan langganan ke gateway");
      }

      setAlertMessage({
        title: locale === "en" ? "Auto-Renewal Disabled" : "Perpanjangan Dinonaktifkan",
        description: t("alerts.successCancel", {
          date: activeSub.endsAt ? new Date(activeSub.endsAt).toLocaleDateString(locale) : ""
        }),
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Silakan masuk terlebih dahulu");

      const response = await fetch(`/api/billing/resume-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tenantId: activeOrgId })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal mengaktifkan kembali langganan");
      }

      setAlertMessage({
        title: locale === "en" ? "Subscription Resumed" : "Langganan Diaktifkan Kembali",
        description: t("alerts.successResume"),
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

  const handleDowngrade = async (targetPlanId: string) => {
    if (!activeOrgId) return;
    setIsDowngrading(true);

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Silakan masuk terlebih dahulu");

      const response = await fetch("/api/billing/downgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          tenantId: activeOrgId,
          targetPlanId: targetPlanId
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Gagal memproses downgrade");

      setAlertMessage({
        title: locale === "en" ? "Downgrade Scheduled" : "Downgrade Dijadwalkan",
        description: `Sukses! Paket Anda saat ini tetap aktif hingga tanggal kadaluarsa. Sistem akan otomatis menurunkan paket Anda setelah jatuh tempo.`,
        variant: "default"
      });

      await fetchActiveSubscription(activeOrgId);
    } catch (err: any) {
      console.error(err);
      setAlertMessage({
        title: "Downgrade Failed",
        description: err.message || "Gagal menjadwalkan penurunan paket.",
        variant: "destructive"
      });
    } finally {
      setIsDowngrading(false);
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
        title: locale === "en" ? "Refund Claimed" : "Refund Diajukan",
        description: t("alerts.successRefund"),
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

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim() || !activeOrgId) return;
    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const response = await fetch('/api/billing/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCodeInput,
          tenantId: activeOrgId
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Gagal memproses kupon");

      setAppliedCoupon({
        code: data.code,
        type: data.discountType,
        value: data.discountValue
      });
      setCouponCodeInput(""); 
    } catch (err: any) {
      setCouponError(err.message || "Kupon tidak dikenal");
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const getRemainingCredit = (): number => {
    if (!activeSub || !activeSub.startsAt || !activeSub.endsAt) return 0;

    const now = new Date().getTime();
    const start = new Date(activeSub.startsAt).getTime();
    const end = new Date(activeSub.endsAt).getTime();

    if (now >= end) return 0;

    const totalDuration = end - start;
    const remainingTime = end - now;

    const activePlanConfig = convertedPlans.find((p) => p.id === activeSub.planId);
    if (!activePlanConfig) return 0;

    const originalPrice =
      billingCycle === "yearly"
        ? activePlanConfig.prices.yearly.convertedAmount
        : activePlanConfig.prices.monthly.convertedAmount;

    const remainingRatio = remainingTime / totalDuration;
    const credit = remainingRatio * originalPrice;

    return Math.max(0, parseFloat(credit.toFixed(2)));
  };

  const getPlanActionType = (planId: string) => {
    if (!activeSub || activeSub.status === "refund_requested") return "choose";

    const currentInterval = getActiveSubscriptionInterval();

    if (activeSub.planId === planId) {
      if (currentInterval === "monthly" && billingCycle === "yearly") {
        return "upgrade_cycle";
      }
      if (currentInterval === "yearly" && billingCycle === "monthly") {
        return "downgrade_cycle"; 
      }
      return "active";
    }

    const planWeights: Record<string, number> = { free: 1, starter: 2, pro: 3 };
    const currentWeight = planWeights[activeSub.planId] || 1;
    const targetWeight = planWeights[planId] || 1;

    return targetWeight > currentWeight ? "upgrade" : "downgrade";
  };

  const getUpgradePrice = (targetPlan: ConvertedPlan) => {
    const targetPrice =
      billingCycle === "yearly"
        ? targetPlan.prices.yearly.convertedAmount
        : targetPlan.prices.monthly.convertedAmount;

    const credit = getRemainingCredit();
    const actionType = getPlanActionType(targetPlan.id);

    const isUpgrade = actionType === "upgrade";
    const isCycleUpgrade = actionType === "upgrade_cycle";
    const isCycleDowngrade = actionType === "downgrade_cycle";

    // Kredit pro-rata diberikan untuk upgrade, switch monthly->yearly, DAN switch yearly->monthly
    // agar tampilan konsisten dgn perhitungan server (yg mengkompensasi sisa waktu interval lama).
    if (!isUpgrade && !isCycleUpgrade && !isCycleDowngrade) {
      return { finalPrice: targetPrice, creditUsed: 0 };
    }

    const finalPrice = targetPrice - credit;

    return {
      finalPrice: Math.max(1, parseFloat(finalPrice.toFixed(2))),
      creditUsed: credit
    };
  };

  const isSubActive =
    activeSub &&
    activeSub.status === "active" &&
    (activeSub.endsAt === null || new Date() < new Date(activeSub.endsAt));

  const getDaysLeft = (): number => {
    if (!activeSub || !activeSub.endsAt) return 0;
    const now = new Date().getTime();
    const end = new Date(activeSub.endsAt).getTime();
    const diffTime = end - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysLeft();
  const showWarningBanner = isSubActive && daysLeft <= 3 && daysLeft > 0;

  const activePlanConfig = activeSub ? convertedPlans.find((p) => p.id === activeSub.planId) : null;
  const currentActivePrice = activePlanConfig
    ? billingCycle === "yearly"
      ? activePlanConfig.prices.yearly.convertedAmount
      : activePlanConfig.prices.monthly.convertedAmount
    : 0;

  const getActiveSubscriptionInterval = (): "monthly" | "yearly" => {
    if (!activeSub || !activeSub.startsAt || !activeSub.endsAt) return "monthly";
    const start = new Date(activeSub.startsAt).getTime();
    const end = new Date(activeSub.endsAt).getTime();
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diffDays > 45 ? "yearly" : "monthly"; 
  };

  const getYearlyDiscountPercent = (plan: ConvertedPlan): number => {
    const monthlyTotal = plan.prices.monthly.amount * 12;
    const yearlyTotal = plan.prices.yearly.amount;

    if (monthlyTotal === 0 || yearlyTotal === 0) return 0;

    const savings = ((monthlyTotal - yearlyTotal) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  return {
    locale,
    targetCurrency,
    t,
    formatPrice,
    activeOrgId,
    billingCycle,
    setBillingCycle,
    alertMessage,
    setAlertMessage,
    activeSub,
    isLoading,
    isUpdatingSub,
    isVerifyingPayment,
    convertedPlans,
    selectedPlan,
    isCheckoutOpen,
    setIsCheckoutOpen,
    isRefundDialogOpen,
    setIsRefundDialogOpen,
    transactions,
    selectedInvoice,
    setSelectedInvoice,
    isInvoiceOpen,
    setIsInvoiceOpen,
    enabledProviders,
    handleChoosePlan,
    handleCancelSubscription,
    handleResumeSubscription,
    handleClaimRefund,
    handleInitiateCheckout,
    getUpgradePrice,
    getPlanActionType,
    isSubActive,
    daysLeft,
    showWarningBanner,
    currentActivePrice,
    handleDowngrade,
    isDowngrading,
    getYearlyDiscountPercent, 
    getActiveSubscriptionInterval,
    couponCodeInput,
    setCouponCodeInput,
    appliedCoupon,
    setAppliedCoupon,
    couponError,
    setCouponError,
    isValidatingCoupon,
    handleApplyCoupon,
  };
}