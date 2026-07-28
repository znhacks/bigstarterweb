"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, X, CheckCircle2, AlertCircle, Loader2, ArrowUpRight, Star } from "lucide-react";
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
import { getLocaleMeta } from "@/config/i18n-culture";
import { billingConfig } from "@/config/payment";

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
    hasUsedTrial,
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
    handleApplyCoupon,
    isEnterpriseOpen,
    setIsEnterpriseOpen,
    enterpriseTarget,
    enterpriseForm,
    setEnterpriseForm,
    isSubmittingEnterprise,
    handleOpenEnterprise,
    handleEnterpriseSubmit,
    isStartingTrial,
    handleStartTrial
  } = useOrganizationBilling();

  const meta = getLocaleMeta(locale);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeOrgId) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10" dir={meta.dir}>
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("alert.title")}</AlertTitle>
          <AlertDescription>{t("alert.desc")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeSubLocalizedName = activeSub?.planName || "";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4" dir={meta.dir}>
      {isVerifyingPayment && (
        <div className="fixed inset-0 z-[9999] flex h-full flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
          <p className="mt-4 text-sm font-semibold text-white">{t("connectToGateway")}</p>
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

      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
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

        <div className="flex flex-wrap items-stretch justify-center gap-3 pt-4">
          {convertedPlans
            .filter((plan) => {
              if (plan.id === "free" || plan.isEnterprise) return true;

              const price =
                billingCycle === "yearly"
                  ? plan.prices?.yearly?.amount
                  : plan.prices?.monthly?.amount;

              return price !== undefined && price !== null && price > 0;
            })
            .map((plan) => {
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

              const localizedName = plan.name;
              const localizedDescription = plan.description;
              const localizedFeatures = plan.features || [];

              return (
                <Card
                  key={plan.id}
                  className={`relative flex w-full max-w-md flex-col justify-between overflow-hidden py-0 transition-all hover:shadow-md sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] ${
                    plan.isRecommended
                      ? "ring-ring border-border border py-0 ring-3 hover:shadow-xl"
                      : ""
                  }`}>
                  {plan.isRecommended && (
                    <div className="from-primary/50 via-primary/80 to-primary absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r" />
                  )}

                  {plan.isRecommended && (
                    <div className="absolute -top-px -right-px">
                      <div className="bg-primary flex h-9 w-9 items-center justify-center rounded-bl-2xl">
                        <Star className="h-4 w-4 fill-white text-white" />
                      </div>
                    </div>
                  )}

                  <CardContent className="flex h-full flex-col justify-between gap-0 p-6 pt-7">
                    <div className="min-w-0 space-y-5">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
                          <h3 className="truncate text-xl font-bold tracking-tight">
                            {localizedName}
                          </h3>
                          {billingCycle === "yearly" && plan.id !== "free" && (
                            <span className="border-border/30 text-primary bg-primary/10 inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold">
                              {t("saveDiscount", { discount: getYearlyDiscountPercent(plan) })}
                            </span>
                          )}
                        </div>
                        <p className="min-h-[40px] text-sm leading-relaxed break-words text-slate-500">
                          {localizedDescription}
                        </p>
                      </div>

                      <div className="flex min-w-0 flex-wrap items-baseline gap-1 pt-1">
                        {plan.isEnterprise ? (
                          <span className="text-2xl font-bold tracking-tight sm:text-2xl">
                            Hubungi Kami
                          </span>
                        ) : (
                          <>
                            <span className="text-3xl font-extrabold tracking-tight break-all text-slate-900 sm:text-4xl">
                              {formatPrice(planPrice)}
                            </span>
                            <span className="shrink-0 text-sm font-medium text-slate-500">
                              /{billingCycle === "yearly" ? "year" : "month"}
                            </span>
                          </>
                        )}
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
                        {plan.isEnterprise ? (
                          <Button
                            onClick={() => handleOpenEnterprise(plan)}
                            className="w-full font-semibold">
                            Hubungi Kami
                          </Button>
                        ) : activeSub && activeSub.pendingPlanId === plan.id ? (
                          <Button
                            disabled
                            className="border-secondary/20 bg-secondary/10 text-secondary/500 w-full cursor-default border font-semibold">
                            {t("buttons.schedule-downgrade")}
                          </Button>
                        ) : isThisPlanActive &&
                          getPlanActionType(plan.id) !== "upgrade_cycle" &&
                          getPlanActionType(plan.id) !== "downgrade_cycle" ? (
                          <div className="w-full space-y-2">
                            <Button
                              disabled
                              className="border-primary-/20 bg-primary/10 text-primary hover:bg-primary/20 w-full cursor-default border font-semibold">
                              {t("buttons.planActive")}
                            </Button>
                            {activeSub?.pendingPlanId && (
                              <p className="text-secondary px-2 text-center text-[10px] leading-normal font-semibold">
                                *Active until{" "}
                                {activeSub.endsAt
                                  ? new Date(activeSub.endsAt).toLocaleDateString(locale)
                                  : ""}{" "}
                              </p>
                            )}
                          </div>
                        ) : getPlanActionType(plan.id) === "upgrade_cycle" ? (
                          <Button
                            onClick={() => handleChoosePlan(plan)}
                            disabled={isDisabled}
                            className="inline-flex w-full items-center justify-center gap-1.5 font-semibold text-white transition-all">
                            <ArrowUpRight className="h-4 w-4 shrink-0" />
                            <span>{t("buttons.switchToYearly")}</span>
                          </Button>
                        ) : getPlanActionType(plan.id) === "downgrade_cycle" ? (
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
                              className="border-secondary w-full font-semibold transition-all hover:bg-slate-50">
                              {isDowngrading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                              <span>{t("buttons.switchToMonthly")}</span>
                            </Button>
                            <p className="px-2 text-center text-[10px] leading-normal break-words text-slate-500">
                              *Paket tahunan Anda tetap aktif sampai masa berakhir, baru kemudian
                              beralih ke bulanan.
                            </p>
                          </div>
                        ) : actionType === "upgrade" && isSubActive ? (
                          <Button
                            onClick={() => handleChoosePlan(plan)}
                            disabled={isDisabled}
                            className="inline-flex w-full items-center justify-center gap-1.5 font-semibold">
                            <ArrowUpRight className="h-4 w-4 shrink-0" />
                            <span className="truncate">{t("buttons.upgrade")}</span>
                          </Button>
                        ) : actionType === "downgrade" && isSubActive ? (
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
                              className="border-secondary hover:bg-secondary/10 w-full font-semibold transition-all">
                              {isDowngrading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                              {t("buttons.downgrade") || "Downgrade Plan"}
                            </Button>
                            <p className="px-2 text-center text-[10px] leading-normal break-words text-slate-500">
                              *{t("downgradeinfo")}
                            </p>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleChoosePlan(plan)}
                            disabled={isDisabled}
                            className="w-full truncate font-semibold transition-all">
                            {t("buttons.choose")}
                          </Button>
                        )}
                      </div>
                      {!plan.isEnterprise &&
                        !!plan.trialDays &&
                        plan.trialDays > 0 &&
                        !isSubActive &&
                        !hasUsedTrial && (
                          <Button
                            variant="outline"
                            onClick={() => handleStartTrial(plan.id)}
                            disabled={isStartingTrial}
                            className="mt-2 w-full text-xs font-semibold text-slate-700">
                            {isStartingTrial && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            Mulai Trial {plan.trialDays} Hari
                          </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>

      {}
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

      {}
      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent
          className="max-h-[90vh] w-[95vw] max-w-[550px] overflow-y-auto rounded-2xl border border-slate-200 p-6 sm:p-8"
          dir={meta.dir}>
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
                            {selectedInvoice.plan_name}
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

      <Dialog
        open={isCheckoutOpen}
        onOpenChange={(open) => {
          setIsCheckoutOpen(open);
          if (!open) {
            setAppliedCoupon(null);
            setCouponCodeInput("");
          }
        }}>
        <DialogContent
          className="w-[95vw] max-w-[450px] border border-slate-200 p-6 sm:p-8"
          dir={meta.dir}>
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
              const selectedPlanLocalizedName = selectedPlan.name;

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
                  <div className="space-y-2 border border-slate-100 bg-slate-50 p-4 text-sm">
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

                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <Label
                      htmlFor="coupon-input"
                      className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                      Punya Kode Promo?
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="coupon-input"
                        placeholder="Contoh: DISKONSAAS20"
                        value={couponCodeInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCouponCodeInput(e.target.value)
                        }
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

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <Button
                      onClick={() => handleInitiateCheckout(billingConfig.activeProvider)}
                      disabled={isVerifyingPayment}
                      className="flex h-9 w-full items-center justify-center gap-2 text-base font-bold text-white">
                      {isVerifyingPayment && <Loader2 className="h-5 w-5 animate-spin" />}
                      {t("dialogPurchase.payNow")}
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent
          className="w-[95vw] max-w-[450px] rounded-2xl border border-slate-200 p-6 sm:p-8"
          dir={meta.dir}>
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

      {}
      <Dialog open={isEnterpriseOpen} onOpenChange={setIsEnterpriseOpen}>
        <DialogContent
          className="w-[95vw] max-w-[450px] rounded-2xl border border-slate-200 p-6 sm:p-8"
          dir={meta.dir}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {enterpriseTarget?.name ? `Hubungi Kami — ${enterpriseTarget.name}` : "Hubungi Kami"}
            </DialogTitle>
            <DialogDescription>
              Sampaikan kebutuhan Anda; tim kami akan menghubungi Anda untuk penawaran enterprise.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Nama
              </Label>
              <Input
                value={enterpriseForm.name}
                onChange={(e: any) => setEnterpriseForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nama lengkap"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Email
              </Label>
              <Input
                type="email"
                value={enterpriseForm.email}
                onChange={(e: any) => setEnterpriseForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="anda@perusahaan.com"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Pesan
              </Label>
              <textarea
                value={enterpriseForm.message}
                onChange={(e: any) => setEnterpriseForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Jumlah seat, kebutuhan khusus, dll."
                rows={4}
                className="w-full rounded-md border border-slate-200 p-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEnterpriseOpen(false)}
              className="rounded-xl">
              Batal
            </Button>
            <Button
              onClick={handleEnterpriseSubmit}
              disabled={isSubmittingEnterprise || !enterpriseForm.email}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
              {isSubmittingEnterprise && <Loader2 className="h-4 w-4 animate-spin" />}
              Kirim Permintaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
