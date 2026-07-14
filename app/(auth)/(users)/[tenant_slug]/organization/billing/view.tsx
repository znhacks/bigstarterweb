// app/(auth)/(users)/[tenant_slug]/organization/billing/view.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, X, CheckCircle2, AlertCircle, Loader2, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

import { useOrganizationBilling } from "./logic";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/lib/i18n/format";
import { formatTransactionAmount } from "@/lib/i18n/currency";
import { Input } from "@/components/ui/input";

const PROVIDER_LABELS: Record<string, { title: string; subtitle: string; color: string }> = {
  stripe: { title: "Credit Card", subtitle: "Stripe Global Secure", color: "text-indigo-600" },
  paypal: { title: "PayPal Wallet", subtitle: "International Wallet", color: "text-amber-600" },
  paddle: { title: "Paddle", subtitle: "International Tax Compliant", color: "text-purple-600" },
  lemonsqueezy: {
    title: "Lemon Squeezy",
    subtitle: "Fast Global Checkout",
    color: "text-yellow-600"
  },
  midtrans: {
    title: "Midtrans Snap",
    subtitle: "QRIS, VA, Indonesia e-Wallet",
    color: "text-sky-600"
  },
  xendit: { title: "Xendit", subtitle: "Virtual Account & Retail Outlets", color: "text-blue-600" },
  mayar: { title: "Mayar.id", subtitle: "Instant Local QRIS/Transfer", color: "text-emerald-600" },
  braintree: { title: "Braintree", subtitle: "PayPal Service Secure", color: "text-teal-600" }
};

export function OrganizationBilling() {
  const tBilling = useTranslations("billing");
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
    handleClaimRefund,
    handleInitiateCheckout,
    getUpgradePrice,
    getPlanActionType,
    isSubActive,
    daysLeft,
    showWarningBanner,
    handleDowngrade,
    isDowngrading,
    getYearlyDiscountPercent,
    couponCodeInput,
    setCouponCodeInput,
    appliedCoupon,
    setAppliedCoupon,
    couponError,
    isValidatingCoupon,
    handleApplyCoupon
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

  const activeSubLocalizedName = activeSub?.planId
    ? tBilling(`plans.${activeSub.planId}.name`) || activeSub.planName
    : activeSub?.planName || "";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4">
      {isVerifyingPayment && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
          <p className="mt-4 text-sm font-semibold text-white">
            Menghubungkan ke gateway pembayaran eksternal...
          </p>
        </div>
      )}

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
            className="text-muted-foreground hover:text-foreground absolute end-4 top-4 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      {/* SECTION 2: PLANS MATRIX */}
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">{t("changeTitle")}</h2>
          </div>

          <div className="flex items-center justify-center gap-3 py-2 select-none">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`text-sm font-semibold transition-colors focus:outline-none ${
                billingCycle === "monthly"
                  ? "text-slate-950"
                  : "text-slate-400 hover:text-slate-600"
              }`}>
              {t("cycles.monthly")}
            </button>

            <Switch
              checked={billingCycle === "yearly"}
              onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
              className="bg-slate-200 data-[state=checked]:bg-slate-300 data-[state=unchecked]:bg-slate-200"
            />

            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`text-sm font-semibold transition-colors focus:outline-none ${
                billingCycle === "yearly" ? "text-slate-950" : "text-slate-400 hover:text-slate-600"
              }`}>
              {t("cycles.yearly")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {convertedPlans.map((plan) => {
            const actionType = getPlanActionType(plan.id);

            const isThisPlanActive =
              (plan.id === "free" && (!isSubActive || !activeSub)) ||
              (isSubActive && activeSub?.planId === plan.id) ||
              actionType === "active";

            const isDisabled = activeSub?.status === "refund_requested" || isLoading;

            const planPrice =
              billingCycle === "yearly"
                ? plan.prices.yearly.convertedAmount
                : plan.prices.monthly.convertedAmount;

            const localizedName = tBilling(`plans.${plan.id}.name`) || plan.name;
            const localizedDescription =
              tBilling(`plans.${plan.id}.description`) || plan.description;

            let localizedFeatures = plan.features || [];
            try {
              const rawFeatures = tBilling.raw(`plans.${plan.id}.features`);
              if (Array.isArray(rawFeatures)) {
                localizedFeatures = rawFeatures;
              }
            } catch (e) {
              // Fallback
            }

            return (
              <Card
                key={plan.id}
                className="flex h-full flex-col justify-between overflow-hidden bg-white py-0 transition-all hover:shadow-md">
                <CardContent className="flex h-full flex-col justify-between gap-0 sm:p-6">
                  <div className="min-w-0 space-y-5">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="truncate text-xl font-bold tracking-tight text-slate-900">
                          {localizedName}
                        </h3>
                        {billingCycle === "yearly" && plan.id !== "free" && (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/30 bg-emerald-50/50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                            {/* Menghitung persentase secara otomatis & dinamis */}
                            Save {getYearlyDiscountPercent(plan)}%
                          </span>
                        )}
                      </div>
                      <p className="min-h-[40px] text-sm leading-relaxed break-words text-slate-500">
                        {localizedDescription}
                      </p>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-baseline gap-1 pt-1">
                      <span className="text-3xl font-extrabold tracking-tight break-all text-slate-900 sm:text-4xl">
                        {formatPrice(planPrice)}
                      </span>
                      <span className="shrink-0 text-sm font-medium text-slate-500">
                        /{billingCycle === "yearly" ? "year" : "month"}
                      </span>
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-2">
                      <ul className="space-y-2.5 text-sm text-slate-700">
                        {localizedFeatures.map((feature: string, idx: number) => (
                          <li key={idx} className="flex min-w-0 items-start gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span className="text-[13px] leading-relaxed break-words text-slate-600">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="shrink-0 pt-4">
                    <div className="shrink-0 pt-4">
                      {/* 1. KONDISI: Jika Plan ini adalah tujuan downgrade yang dijadwalkan */}
                      {activeSub && activeSub.pendingPlanId === plan.id ? (
                        <Button
                          disabled
                          className="w-full cursor-default border border-amber-500/20 bg-amber-500/10 py-5 font-semibold text-amber-600 hover:bg-amber-500/10">
                          Scheduled Downgrade
                        </Button>
                      ) : // 2. KONDISI (SOLUSI): Mengecualikan 'upgrade_cycle' DAN 'downgrade_cycle' dari tombol kunci Active Plan
                      isThisPlanActive &&
                        getPlanActionType(plan.id) !== "upgrade_cycle" &&
                        getPlanActionType(plan.id) !== "downgrade_cycle" ? (
                        <div className="w-full space-y-2">
                          <Button
                            disabled
                            className="w-full cursor-default border border-emerald-500/20 bg-emerald-500/10 py-5 font-semibold text-emerald-600 hover:bg-emerald-500/10">
                            {t("buttons.planActive")}
                          </Button>
                          {activeSub?.pendingPlanId && (
                            <p className="px-2 text-center text-[10px] leading-normal font-semibold text-amber-600">
                              *Active until{" "}
                              {activeSub.endsAt
                                ? new Date(activeSub.endsAt).toLocaleDateString(locale)
                                : ""}{" "}
                              (Scheduled Downgrade)
                            </p>
                          )}
                        </div>
                      ) : // 3. KONDISI: Jika pengguna memilih Switch ke Tahunan (Monthly -> Yearly)
                      getPlanActionType(plan.id) === "upgrade_cycle" ? (
                        <Button
                          onClick={() => handleChoosePlan(plan)}
                          disabled={isDisabled}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950 py-5 font-semibold text-white transition-all hover:bg-slate-800">
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                          <span>Switch to Yearly</span>
                        </Button>
                      ) : // 4. KONDISI (SEKARANG AKAN TERPANGGIL): Jika pengguna memilih Switch ke Bulanan (Yearly -> Monthly)
                      getPlanActionType(plan.id) === "downgrade_cycle" ? (
                        <div className="w-full space-y-2">
                          <Button
                            onClick={() => {
                              if (
                                confirm(
                                  `Apakah Anda yakin ingin menjadwalkan peralihan ke tagihan Bulanan? Paket Tahunan Anda saat ini tetap aktif sampai akhir periode tanpa tagihan tahunan baru.`
                                )
                              ) {
                                handleDowngrade(plan.id);
                              }
                            }}
                            disabled={isDisabled || isDowngrading}
                            variant="outline"
                            className="w-full border-slate-200 py-5 font-semibold text-slate-700 transition-all hover:bg-slate-50">
                            {isDowngrading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            <span>Switch to Monthly</span>
                          </Button>
                          <p className="px-2 text-center text-[10px] leading-normal break-words text-slate-500">
                            *Paket tahunan Anda tetap aktif sampai masa berakhir, baru kemudian
                            beralih ke bulanan.
                          </p>
                        </div>
                      ) : // 5. KONDISI: Jika tombol upgrade paket ditekan (misal: Starter ke Pro)
                      actionType === "upgrade" && isSubActive ? (
                        <Button
                          onClick={() => handleChoosePlan(plan)}
                          disabled={isDisabled}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950 py-5 font-semibold text-white hover:bg-slate-800">
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                          <span className="truncate">{t("buttons.upgrade")}</span>
                        </Button>
                      ) : // 4. KONDISI: Jika tombol downgrade ditekan
                      actionType === "downgrade" && isSubActive ? (
                        <div className="w-full space-y-2">
                          <Button
                            onClick={() => {
                              if (
                                confirm(
                                  `Apakah Anda yakin ingin menjadwalkan penurunan paket ke ${localizedName}? Paket aktif Anda tetap bisa digunakan hingga jatuh tempo.`
                                )
                              ) {
                                handleDowngrade(plan.id);
                              }
                            }}
                            disabled={isDisabled || isDowngrading}
                            variant="outline"
                            className="w-full border-slate-200 py-5 font-semibold text-slate-700 transition-all hover:bg-slate-50">
                            {isDowngrading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            {t("buttons.downgrade") || "Downgrade Plan"}
                          </Button>
                          <p className="px-2 text-center text-[10px] leading-normal break-words text-slate-500">
                            *{t("downgradeinfo")}
                          </p>
                        </div>
                      ) : (
                        // 5. KONDISI DEFAULT: Tombol pilih paket biasa
                        <Button
                          onClick={() => handleChoosePlan(plan)}
                          disabled={isDisabled}
                          className="w-full truncate bg-slate-950 py-5 font-semibold text-white transition-all hover:bg-slate-800">
                          {t("buttons.choose", { planName: localizedName })}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* SECTION 3: TRANSACTION HISTORY */}
        <div className="space-y-4 border-t border-slate-200/60 pt-8">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-950">
              {t("history.title")}
            </h2>
            <p className="text-sm text-slate-500">{t("history.desc")}</p>
          </div>

          <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/60 bg-slate-50/70 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    <th className="px-6 py-4">{t("history.table.date")}</th>
                    <th className="px-6 py-4">{t("history.table.txId")}</th>
                    <th className="px-6 py-4">{t("history.table.planName")}</th>
                    <th className="px-6 py-4">{t("history.table.amount")}</th>
                    <th className="px-6 py-4">{t("history.table.status")}</th>
                    <th className="px-6 py-4 text-end">{t("history.table.action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 text-slate-800">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {t("history.table.empty")}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                          {formatDateTime(tx.created_at, locale, { dateStyle: "long" })}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-slate-500">
                          {tx.order_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="border-slate-200 font-semibold capitalize">
                            {tx.plan_name}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-bold whitespace-nowrap">
                          {formatTransactionAmount(tx.amount, tx.currency, tx.amount_in_idr, locale)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="rounded-full border-emerald-500/10 bg-emerald-50 font-medium text-emerald-600 hover:bg-emerald-100/50">
                            {tx.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-end whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(tx);
                              setIsInvoiceOpen(true);
                            }}
                            className="h-8 rounded-lg border-slate-200 text-xs font-semibold hover:bg-slate-50">
                            {t("history.table.viewInvoice")}
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
            <AlertTitle className="font-bold text-amber-900">{t("warning.title")}</AlertTitle>
            <AlertDescription className="text-sm leading-normal break-words text-amber-800/90">
              {t("warning.desc", { planName: activeSubLocalizedName, days: daysLeft })}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* DIALOG MODAL DETAIL INVOICE */}
      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-[550px] overflow-y-auto rounded-2xl border border-slate-200 p-6 sm:p-8">
          {selectedInvoice && (
            <div className="space-y-6">
              <div id="printable-invoice" className="space-y-6 print:p-0">
                <div className="flex items-start justify-between border-b border-slate-200 pb-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">
                      {t("invoice.title")}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      {t("invoice.id")}: #{selectedInvoice.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="text-end">
                    <h3 className="text-sm font-bold text-slate-900">
                      {t("invoice.prepaidService")}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t("invoice.date")}: {formatDateTime(selectedInvoice.created_at, locale)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-semibold tracking-wider text-slate-400 uppercase">
                      {t("invoice.billedTo")}:
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{t("invoice.orgId")}</p>
                    <p className="mt-0.5 font-mono break-all text-slate-400">
                      {selectedInvoice.tenant_id}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-semibold tracking-wider text-slate-400 uppercase">
                      {t("invoice.paymentMethod")}:
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {selectedInvoice.provider
                        ? selectedInvoice.provider.toUpperCase()
                        : "Gateway Payment"}
                    </p>
                    <p className="mt-0.5 break-all text-slate-400">
                      {t("invoice.refId")}: {selectedInvoice.order_id.slice(0, 15)}...
                    </p>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-500 uppercase">
                        <th className="px-4 py-3">{t("invoice.table.desc")}</th>
                        <th className="px-4 py-3 text-end">{t("invoice.table.total")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-900 capitalize">
                            {t("invoice.table.itemTitle", {
                              planName:
                                tBilling(`plans.${selectedInvoice.plan_name}.name`) ||
                                selectedInvoice.plan_name
                            })}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {t("invoice.table.itemDesc")}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-end text-sm font-bold text-slate-900">
                          {formatTransactionAmount(
                      selectedInvoice.amount,
                      selectedInvoice.currency,
                      selectedInvoice.amount_in_idr,
                      locale
                    )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm font-bold">
                  <span className="text-slate-700">{t("invoice.totalPaid")}</span>
                  <span className="text-lg text-slate-950">
                    {formatTransactionAmount(
                      selectedInvoice.amount,
                      selectedInvoice.currency,
                      selectedInvoice.amount_in_idr,
                      locale
                    )}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400">
                  {t("invoice.footer")}
                </div>
              </div>

              <DialogFooter className="gap-2 border-t border-slate-100 pt-4 sm:gap-0 print:hidden">
                <Button
                  variant="outline"
                  onClick={() => setIsInvoiceOpen(false)}
                  className="rounded-xl">
                  {t("buttons.close")}
                </Button>
                <Button
                  onClick={() => {
                    window.print();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                  {t("buttons.print")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG MODAL CHECKOUT MULTI-PROVIDER */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="w-[95vw] max-w-[450px] rounded-2xl border border-slate-200 p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {t("dialogPurchase.title")}
            </DialogTitle>
            <DialogDescription>{t("dialogPurchase.desc")}</DialogDescription>
          </DialogHeader>

          {selectedPlan &&
            (() => {
              const { finalPrice, creditUsed } = getUpgradePrice(selectedPlan);
              const isUpgrade = getPlanActionType(selectedPlan.id) === "upgrade";
              const selectedPlanLocalizedName =
                tBilling(`plans.${selectedPlan.id}.name`) || selectedPlan.name;

              return (
                <div className="space-y-6 py-4">
                  <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">
                        {t("dialogPurchase.planCycle", {
                          planName: selectedPlanLocalizedName,
                          cycle: t(`cycles.${billingCycle}`)
                        })}
                      </span>
                      <span className="font-semibold text-slate-950">
                        {formatPrice(
                          billingCycle === "yearly"
                            ? selectedPlan.prices.yearly.convertedAmount
                            : selectedPlan.prices.monthly.convertedAmount
                        )}
                      </span>
                    </div>

                    {isUpgrade && creditUsed > 0 && (
                      <div className="flex items-center justify-between text-xs font-medium text-emerald-600">
                        <span>{t("dialogPurchase.creditApplied")}</span>
                        <span>-{formatPrice(creditUsed)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-base font-bold text-slate-900">
                      <span>{t("dialogPurchase.amountToPay")}</span>
                      <span>{formatPrice(finalPrice)}</span>
                    </div>

                    {billingCycle === "yearly" && (
                      <div className="text-end text-[10px] text-slate-400 italic">
                        {t("dialogPurchase.billedAnnually")}
                      </div>
                    )}
                  </div>

                  {/* Render Tombol Pilihan Payment Gateway Dinamis dari .env */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                      {t("dialogPurchase.selectPaymentMethod") || "Pilih Metode Pembayaran:"}
                    </p>
                    <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
                      {enabledProviders.map((provider) => {
                        const meta = PROVIDER_LABELS[provider] || {
                          title: provider.toUpperCase(),
                          subtitle: "Secure Payment Option",
                          color: "text-slate-600"
                        };

                        return (
                          <Button
                            key={provider}
                            variant="outline"
                            onClick={() => handleInitiateCheckout(provider)}
                            className="flex h-16 flex-col items-start justify-center gap-0.5 rounded-xl border border-slate-200 px-4 hover:border-slate-300 hover:bg-slate-50/50">
                            <span className={`text-sm font-bold ${meta.color}`}>{meta.title}</span>
                            <span className="text-[10px] text-slate-400">{meta.subtitle}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* DIALOG MODAL CHECKOUT MULTI-PROVIDER */}
      <Dialog
        open={isCheckoutOpen}
        onOpenChange={(open) => {
          setIsCheckoutOpen(open);
          if (!open) {
            setAppliedCoupon(null); // Reset kupon jika modal ditutup
            setCouponCodeInput("");
          }
        }}>
        <DialogContent className="w-[95vw] max-w-[450px] rounded-2xl border border-slate-200 p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {t("dialogPurchase.title")}
            </DialogTitle>
            <DialogDescription>{t("dialogPurchase.desc")}</DialogDescription>
          </DialogHeader>

          {selectedPlan &&
            (() => {
              const { finalPrice, creditUsed } = getUpgradePrice(selectedPlan);
              const isUpgrade =
                getPlanActionType(selectedPlan.id) === "upgrade" ||
                getPlanActionType(selectedPlan.id) === "upgrade_cycle";
              const selectedPlanLocalizedName =
                tBilling(`plans.${selectedPlan.id}.name`) || selectedPlan.name;

              // 1. KALKULASI NOMINAL DISKON KUPON DI SISI FRONTEND (INTERAKTIF)
              let couponDiscountValue = 0;
              if (appliedCoupon) {
                if (appliedCoupon.type === "percentage") {
                  couponDiscountValue = (appliedCoupon.value / 100) * finalPrice;
                } else {
                  couponDiscountValue = appliedCoupon.value;
                }
              }

              const totalToPay = Math.max(
                1,
                parseFloat((finalPrice - couponDiscountValue).toFixed(2))
              );

              return (
                <div className="space-y-5 py-2">
                  <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">
                        {t("dialogPurchase.planCycle", {
                          planName: selectedPlanLocalizedName,
                          cycle: t(`cycles.${billingCycle}`)
                        })}
                      </span>
                      <span className="font-semibold text-slate-950">
                        {formatPrice(
                          billingCycle === "yearly"
                            ? selectedPlan.prices.yearly.convertedAmount
                            : selectedPlan.prices.monthly.convertedAmount
                        )}
                      </span>
                    </div>

                    {isUpgrade && creditUsed > 0 && (
                      <div className="flex items-center justify-between text-xs font-medium text-emerald-600">
                        <span>{t("dialogPurchase.creditApplied")}</span>
                        <span>-{formatPrice(creditUsed)}</span>
                      </div>
                    )}

                    {/* Rincian Potongan Kupon Diskon Aktif */}
                    {appliedCoupon && (
                      <div className="flex items-center justify-between text-xs font-medium text-blue-600">
                        <span>Diskon Kupon ({appliedCoupon.code})</span>
                        <span>-{formatPrice(couponDiscountValue)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-base font-bold text-slate-900">
                      <span>{t("dialogPurchase.amountToPay")}</span>
                      <span className="text-lg text-emerald-600">{formatPrice(totalToPay)}</span>
                    </div>
                  </div>

                  {/* FORM INPUT KODE KUPON (FITUR BARU) */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <Label
                      htmlFor="coupon-input"
                      className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                      Miliki Kode Promo?
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="coupon-input"
                        placeholder="Contoh: DISKONSAAS20"
                        value={couponCodeInput}
                        onChange={(e: any) => setCouponCodeInput(e.target.value)}
                        disabled={isValidatingCoupon || !!appliedCoupon}
                        className="h-9 text-xs uppercase"
                      />
                      <Button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponCodeInput.trim() || !!appliedCoupon}
                        className="h-9 shrink-0 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800">
                        {isValidatingCoupon && <Loader2 className="me-1 h-3 w-3 animate-spin" />}
                        Terapkan
                      </Button>
                    </div>
                    {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
                    {appliedCoupon && (
                      <div className="mt-1 flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-xs text-emerald-700">
                        <span>
                          Kupon <b>{appliedCoupon.code}</b> sukses diterapkan!
                        </span>
                        <button
                          onClick={() => setAppliedCoupon(null)}
                          className="font-bold text-emerald-500 hover:text-emerald-950">
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Render Tombol Pilihan Payment Gateway */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                      {t("dialogPurchase.selectPaymentMethod") || "Pilih Metode Pembayaran:"}
                    </p>
                    <div className="flex max-h-[180px] flex-col gap-2 overflow-y-auto pr-1">
                      {enabledProviders.map((provider) => {
                        const meta = PROVIDER_LABELS[provider] || {
                          title: provider.toUpperCase(),
                          subtitle: "Secure Payment Option",
                          color: "text-slate-600"
                        };

                        return (
                          <Button
                            key={provider}
                            variant="outline"
                            onClick={() => handleInitiateCheckout(provider)}
                            className="flex h-14 flex-col items-start justify-center gap-0.5 rounded-xl border border-slate-200 px-4 hover:border-slate-300 hover:bg-slate-50/50">
                            <span className={`text-sm font-bold ${meta.color}`}>{meta.title}</span>
                            <span className="text-[10px] text-slate-400">{meta.subtitle}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* DIALOG MODAL REFUND */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[450px] rounded-2xl border border-slate-200 p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {t("dialogRefund.title")}
            </DialogTitle>
            <DialogDescription>
              {t("dialogRefund.desc", { planName: activeSubLocalizedName })}
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
              {t("buttons.cancel")}
            </Button>
            <Button
              onClick={handleClaimRefund}
              disabled={isUpdatingSub}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 text-white hover:bg-red-800">
              {isUpdatingSub && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("buttons.confirmRefund")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
