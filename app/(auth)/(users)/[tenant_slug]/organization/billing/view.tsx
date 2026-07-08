"use client";

import * as React from "react";
import {
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  RefreshCw,
  Undo2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { plans } from "@/config/billing";
import { useOrganizationBilling } from "./logic";

export function OrganizationBilling() {
  const {
    locale,
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
    handleChoosePlan,
    handleCancelSubscription,
    handleResumeSubscription,
    handleClaimRefund,
    handlePaymentSuccess,
    getUpgradePrice,
    getPlanActionType,
    isSubActive,
    daysLeft,
    showWarningBanner,
    currentActivePrice
  } = useOrganizationBilling();

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
          <AlertTitle>{t("alert.title")}</AlertTitle>
          <AlertDescription>{t("alert.desc")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
        currency: "USD"
      }}>
      <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-8">
        {isVerifyingPayment && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            <p className="mt-4 text-sm font-semibold text-white">{t("loading")}</p>
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

        {/* SECTION 1: ACTIVE SUBSCRIPTION DETAILS */}
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
            <CardContent className="space-y-6 p-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-2xl font-bold tracking-tight text-slate-950">
                      {isSubActive && activeSub ? activeSub.planName : "Free"}
                    </h3>

                    {activeSub?.status === "refund_requested" ? (
                      <Badge className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/15">
                        {t("badges.refundRequested") || "Refund Requested"}
                      </Badge>
                    ) : isSubActive && activeSub?.cancelAtPeriodEnd ? (
                      <Badge className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-500/15">
                        {t("badges.willCancel") || "Will Cancel"}
                      </Badge>
                    ) : isSubActive ? (
                      <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/15">
                        {t("badges.active") || "Active"}
                      </Badge>
                    ) : (
                      <Badge className="border-muted-foreground/20 bg-muted text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                        {t("badges.freeActive") || "Free Active"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {activeSub?.status === "refund_requested"
                      ? t("subDetails.activeDesc", { price: formatPrice(activeSub?.price ?? 0) })
                      : isSubActive && activeSub
                        ? `${t("subDetails.activeDesc", { price: formatPrice(activeSub.price) })} ${
                            activeSub.endsAt
                              ? `${
                                  activeSub.cancelAtPeriodEnd
                                    ? t("subDetails.endsOn")
                                    : t("subDetails.renewsOn")
                                } ${new Date(activeSub.endsAt).toLocaleDateString("id-ID")}`
                              : ""
                          }`
                        : t("subDetails.freeDesc") || "You are currently on the free plan."}
                  </p>
                </div>

                {isSubActive && activeSub && (
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
                        {t("buttons.activateRenewal") || "Activate Renewal"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => setIsRefundDialogOpen(true)}
                          disabled={isUpdatingSub}
                          variant="outline"
                          className="border-border/80 inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold">
                          <Undo2 className="h-3.5 w-3.5" />
                          {t("buttons.claimRefund") || "Claim Refund"}
                        </Button>
                        <Button
                          onClick={handleCancelSubscription}
                          disabled={isUpdatingSub}
                          variant="destructive"
                          className="h-10 rounded-xl px-4 text-xs font-semibold">
                          {isUpdatingSub && <Loader2 className="h-4 w-4 animate-spin" />}
                          {t("buttons.cancelRenewal") || "Cancel Renewal"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-bold tracking-tight text-slate-950">
                  {formatPrice(isSubActive ? currentActivePrice : 0)}
                </span>
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: PLANS MATRIX (COMPARED TO IMAGE DESIGN) */}
        <div className="space-y-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                {t("changeTitle") || "Choose Your Plan"}
              </h2>
            </div>

            {/* Custom Toggle Switch (Monthly vs Yearly) */}
            <div className="flex items-center gap-2.5 rounded-full border border-slate-100 bg-slate-50 p-1.5">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}>
                {t("cycles.monthly") || "Monthly"}
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  billingCycle === "yearly"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}>
                {t("cycles.yearly") || "Yearly"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-3">
            {plans.map((plan) => {
              const actionType = getPlanActionType(plan.id);

              // Helper untuk menentukan apakah plan saat ini adalah yang aktif untuk user
              const isThisPlanActive =
                (plan.id === "free" && (!isSubActive || !activeSub)) ||
                (isSubActive && activeSub?.planId === plan.id) ||
                actionType === "active";

              const isDisabled = activeSub?.status === "refund_requested" || isLoading;

              // Tentukan harga berdasarkan siklus tagihan
              const planPrice =
                billingCycle === "yearly" ? plan.prices.yearly.amount : plan.prices.monthly.amount;

              return (
                <Card
                  key={plan.id}
                  className="flex h-full flex-col justify-between overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md">
                  <CardContent className="flex h-full flex-col justify-between gap-6 p-8">
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xl font-bold tracking-tight text-slate-900">
                            {plan.name}
                          </h3>
                          {billingCycle === "yearly" && plan.id !== "free" && (
                            <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/30 bg-emerald-50/50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                              Save 17%
                            </span>
                          )}
                        </div>
                        <p className="min-h-[40px] text-sm leading-relaxed text-slate-500">
                          {plan.description}
                        </p>
                      </div>

                      <div className="flex items-baseline gap-1 pt-1">
                        <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                          {formatPrice(planPrice)}
                        </span>
                        <span className="text-sm font-medium text-slate-500">
                          /{billingCycle === "yearly" ? "year" : "month"}
                        </span>
                      </div>

                      <div className="space-y-3 border-t border-slate-100 pt-2">
                        <ul className="space-y-2.5 text-sm text-slate-700">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2.5">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              <span className="text-[13px] text-slate-600">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-4">
                      {isThisPlanActive ? (
                        <Button
                          disabled
                          className="w-full cursor-default rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-5 font-semibold text-emerald-600 hover:bg-emerald-500/10">
                          {t("buttons.planActive") || "Active"}
                        </Button>
                      ) : actionType === "upgrade" && isSubActive ? (
                        <Button
                          onClick={() => handleChoosePlan(plan)}
                          disabled={isDisabled}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950 py-5 font-semibold text-white hover:bg-slate-800">
                          <ArrowUpRight className="h-4 w-4" />
                          {t("buttons.upgrade") || "Upgrade Plan"}
                        </Button>
                      ) : actionType === "downgrade" && isSubActive ? (
                        <div className="w-full space-y-2">
                          <Button
                            disabled
                            variant="outline"
                            className="w-full cursor-not-allowed rounded-xl py-5 font-semibold opacity-60">
                            {t("buttons.downgrade") || "Downgrade"}
                          </Button>
                          <p className="px-2 text-center text-[10px] leading-normal text-slate-500">
                            *{t("downgradeinfo")}
                          </p>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleChoosePlan(plan)}
                          disabled={isDisabled}
                          className="w-full rounded-xl bg-slate-950 py-5 font-semibold text-white transition-all hover:bg-slate-800">
                          {`Choose ${plan.name}`}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* SECTION 3: TRANSACTION HISTORY & SELF-SERVICE PORTAL */}
          <div className="space-y-4 border-t border-slate-200/60 pt-8">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                {locale === "English" ? "Billing History" : "Riwayat Pembayaran"}
              </h2>
              <p className="text-sm text-slate-500">
                {locale === "English"
                  ? "View your past transactions and download official invoices/receipts."
                  : "Lihat transaksi masa lalu Anda dan unduh invoice/kuitansi resmi."}
              </p>
            </div>

            <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50/70 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Plan Name</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 text-slate-800">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400">
                          {locale === "English"
                            ? "No transaction history found."
                            : "Belum ada riwayat transaksi."}
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="transition-colors hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-medium">
                            {new Date(tx.created_at).toLocaleDateString(
                              locale === "English" ? "en-US" : "id-ID",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              }
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {tx.order_id}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className="border-slate-200 font-semibold capitalize">
                              {tx.plan_name}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 font-bold">{formatPrice(tx.amount)}</td>
                          <td className="px-6 py-4">
                            <Badge className="rounded-full border-emerald-500/10 bg-emerald-50 font-medium text-emerald-600 hover:bg-emerald-100/50">
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
                              className="h-8 rounded-lg border-slate-200 text-xs font-semibold hover:bg-slate-50">
                              {locale === "English" ? "View Invoice" : "Lihat Invoice"}
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

        {/* ACTIVE PLAN EXPIRY WARNING BANNER */}
        {showWarningBanner && activeSub && (
          <Alert className="flex items-start gap-3 rounded-2xl border-amber-500/30 bg-amber-50/50 p-4 text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <AlertTitle className="font-bold text-amber-900">
                {locale === "English"
                  ? "Action Required: Plan Expiring Soon!"
                  : "Perhatian: Masa Aktif Paket Paket Hampir Habis!"}
              </AlertTitle>
              <AlertDescription className="text-sm leading-normal text-amber-800/90">
                {locale === "English"
                  ? `Your premium prepaid access to the ${activeSub.planName} plan will expire in ${daysLeft} day(s). Renew or upgrade today to avoid interruption to your workflow.`
                  : `Masa aktif akses premium paket ${activeSub.planName} Anda akan berakhir dalam ${daysLeft} hari lagi. Lakukan pembelian ulang atau upgrade hari ini agar alur kerja Anda tidak terganggu.`}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* DIALOG MODAL DETAIL INVOICE */}
        <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 p-8 sm:max-w-[550px]">
            {selectedInvoice && (
              <div className="space-y-6">
                <div id="printable-invoice" className="space-y-6 print:p-0">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-6">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">
                        INVOICE RECEIPT
                      </h2>
                      <p className="mt-1 font-mono text-xs text-slate-400">
                        ID: #{selectedInvoice.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <h3 className="text-sm font-bold text-slate-900">PREPAID SERVICE</h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Date: {new Date(selectedInvoice.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-semibold tracking-wider text-slate-400 uppercase">
                        Billed To:
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">Organization ID</p>
                      <p className="mt-0.5 font-mono text-slate-400">{selectedInvoice.tenant_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tracking-wider text-slate-400 uppercase">
                        Payment Method:
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">PayPal Checkout</p>
                      <p className="mt-0.5 text-slate-400">
                        Ref ID: {selectedInvoice.order_id.slice(0, 15)}...
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-500 uppercase">
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="px-4 py-4">
                            <p className="font-bold text-slate-900 capitalize">
                              {selectedInvoice.plan_name} Plan Access
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              Prepaid SaaS premium feature access.
                            </p>
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">
                            {formatPrice(selectedInvoice.amount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm font-bold">
                    <span className="text-slate-700">Total Paid (USD)</span>
                    <span className="text-lg text-slate-950">
                      {formatPrice(selectedInvoice.amount)}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400">
                    Thank you for your purchase! This is an official digital receipt for your
                    prepaid service.
                  </div>
                </div>

                <DialogFooter className="gap-2 border-t border-slate-100 pt-4 sm:gap-0 print:hidden">
                  <Button
                    variant="outline"
                    onClick={() => setIsInvoiceOpen(false)}
                    className="rounded-xl">
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      window.print();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                    Print / Save PDF
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* DIALOG MODAL CHECKOUT */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="rounded-2xl border border-slate-200 sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {t("dialogPurchase.title") || "Confirm Purchase"}
              </DialogTitle>
              <DialogDescription>
                {t("dialogPurchase.desc") || "Please review your package information below."}
              </DialogDescription>
            </DialogHeader>

            {selectedPlan &&
              (() => {
                const { finalPrice, creditUsed } = getUpgradePrice(selectedPlan);
                const isUpgrade = getPlanActionType(selectedPlan.id) === "upgrade";

                return (
                  <div className="space-y-6 py-4">
                    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">
                          {selectedPlan.name} Plan ({billingCycle})
                        </span>
                        <span className="font-semibold text-slate-950">
                          {formatPrice(
                            billingCycle === "yearly"
                              ? selectedPlan.prices.yearly.amount
                              : selectedPlan.prices.monthly.amount
                          )}
                        </span>
                      </div>

                      {isUpgrade && creditUsed > 0 && (
                        <div className="flex items-center justify-between text-xs font-medium text-emerald-600">
                          <span>Prepaid Credit Applied</span>
                          <span>-{formatPrice(creditUsed)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-base font-bold text-slate-900">
                        <span>Amount to Pay</span>
                        <span>{formatPrice(finalPrice)}</span>
                      </div>

                      {billingCycle === "yearly" && (
                        <div className="text-right text-[10px] text-slate-400 italic">
                          Billed annually
                        </div>
                      )}
                    </div>

                    <div className="min-h-[150px] space-y-3">
                      <PayPalButtons
                        style={{ layout: "vertical", shape: "rect", label: "subscribe" }}
                        createSubscription={(data, actions) => {
                          const activePlanId =
                            billingCycle === "yearly"
                              ? selectedPlan.prices.yearly.paypalPlanId
                              : selectedPlan.prices.monthly.paypalPlanId;

                          if (!activePlanId) {
                            alert("PayPal Plan ID tidak ditemukan untuk paket ini.");
                            throw new Error("Missing Plan ID");
                          }

                          return actions.subscription.create({
                            plan_id: activePlanId,
                            custom_id: activeOrgId || undefined
                          });
                        }}
                        onApprove={async (data, actions) => {
                          if (data.subscriptionID) {
                            await handlePaymentSuccess({ id: data.subscriptionID });
                            setIsCheckoutOpen(false);
                          }
                        }}
                        onError={() => {
                          setAlertMessage({
                            title: "Payment Failed",
                            description:
                              "Terjadi kesalahan selama memproses langganan PayPal. Silakan coba kembali.",
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

        {/* DIALOG MODAL REFUND */}
        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
          <DialogContent className="rounded-2xl border border-slate-200 sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {t("dialogRefund.title") || "Request Refund"}
              </DialogTitle>
              <DialogDescription>
                {t("dialogRefund.desc", { planName: activeSub?.planName || "" })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-sm leading-relaxed text-slate-600">
              <p>{t("dialogRefund.warn1")}</p>
              <p className="rounded-xl border border-dashed border-red-500/20 bg-red-50 p-3 text-xs font-semibold text-red-600">
                {t("dialogRefund.warn2")}
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                disabled={isUpdatingSub}
                onClick={() => setIsRefundDialogOpen(false)}
                className="rounded-xl">
                {t("buttons.cancel") || "Cancel"}
              </Button>
              <Button
                onClick={handleClaimRefund}
                disabled={isUpdatingSub}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 text-white hover:bg-red-800">
                {isUpdatingSub && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("buttons.confirmRefund") || "Confirm Refund"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PayPalScriptProvider>
  );
}
