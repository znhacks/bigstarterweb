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
import { plans } from "@/config/billing";
import { useOrganizationBilling } from "./logic";
// Sesuaikan path-nya
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
              className="text-muted-foreground hover:text-foreground absolute top-4 end-4 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">{t("title")}</h2>
            <p className="text-muted-foreground text-sm">{t("desc")}</p>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="space-y-6 p-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-2xl font-bold tracking-tight">
                      {isSubActive ? activeSub.planName : "Free"}
                    </h3>

                    {activeSub?.status === "refund_requested" ? (
                      <Badge className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/15">
                        {t("badges.refundRequested")}
                      </Badge>
                    ) : isSubActive && activeSub?.cancelAtPeriodEnd ? (
                      <Badge className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-500/15">
                        {t("badges.willCancel")}
                      </Badge>
                    ) : isSubActive ? (
                      <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/15">
                        {t("badges.active")}
                      </Badge>
                    ) : (
                      <Badge className="border-muted-foreground/20 bg-muted text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                        {t("badges.freeActive")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {activeSub?.status === "refund_requested"
                      ? t("subDetails.activeDesc", { price: formatPrice(activeSub.price) })
                      : isSubActive
                        ? `${t("subDetails.activeDesc", { price: formatPrice(activeSub.price) })} ${
                            activeSub.endsAt
                              ? `${
                                  activeSub.cancelAtPeriodEnd
                                    ? t("subDetails.endsOn")
                                    : t("subDetails.renewsOn")
                                } ${new Date(activeSub.endsAt).toLocaleDateString("id-ID")}`
                              : ""
                          }`
                        : t("subDetails.freeDesc")}
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
                        {t("buttons.activateRenewal")}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => setIsRefundDialogOpen(true)}
                          disabled={isUpdatingSub}
                          variant="outline"
                          className="border-border/80 inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold">
                          <Undo2 className="h-3.5 w-3.5" />
                          {t("buttons.claimRefund")}
                        </Button>
                        <Button
                          onClick={handleCancelSubscription}
                          disabled={isUpdatingSub}
                          variant="destructive"
                          className="h-10 rounded-xl px-4 text-xs font-semibold">
                          {isUpdatingSub && <Loader2 className="h-4 w-4 animate-spin" />}
                          {t("buttons.cancelRenewal")}
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
              {t("changeTitle")}
            </h2>
            <p className="text-muted-foreground text-sm">{t("changeDesc")}</p>
          </div>

          <div className="flex justify-center">
            <Tabs
              value={billingCycle}
              onValueChange={(val) => setBillingCycle(val as "monthly" | "yearly")}
              className="w-auto">
              <TabsList className="border-border/60 h-auto w-full justify-center gap-6 rounded-none border-b bg-transparent p-0">
                <TabsTrigger
                  value="monthly"
                  className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2 text-sm font-medium shadow-none transition-all data-[state=active]:bg-transparent">
                  {t("cycles.monthly")}
                </TabsTrigger>
                <TabsTrigger
                  value="yearly"
                  className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2 text-sm font-medium shadow-none transition-all data-[state=active]:bg-transparent">
                  {t("cycles.yearly")}
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

              if (plan.id === "free") return null;

              return (
                <Card
                  key={plan.id}
                  className="border-border/80 flex h-full flex-col justify-between overflow-visible rounded-2xl border shadow-sm transition-all">
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
                        {t("buttons.planActive")}
                      </Button>
                    ) : actionType === "upgrade" && isSubActive ? (
                      <Button
                        onClick={() => handleChoosePlan(plan)}
                        disabled={isDisabled}
                        className="bg-foreground text-background hover:bg-foreground/90 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-5 font-semibold">
                        <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                        {t("buttons.upgrade")}
                      </Button>
                    ) : actionType === "downgrade" && isSubActive ? (
                      <div className="w-full space-y-2">
                        <Button
                          disabled
                          variant="outline"
                          className="w-full cursor-not-allowed rounded-xl py-5 font-semibold opacity-60">
                          {t("buttons.downgrade")}
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
                        {t("buttons.choose")}
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
                {locale === "English" ? "Billing History" : "Riwayat Pembayaran"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {locale === "English"
                  ? "View your past transactions and download official invoices/receipts."
                  : "Lihat transaksi masa lalu Anda dan unduh invoice/kuitansi resmi."}
              </p>
            </div>

            <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-start text-sm">
                  <thead>
                    <tr className="border-border/60 bg-muted/40 text-muted-foreground border-b text-xs font-semibold tracking-wider uppercase">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Plan Name</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/40 text-foreground/90 divide-y">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-muted-foreground py-10 text-center">
                          {locale === "English"
                            ? "No transaction history found."
                            : "Belum ada riwayat transaksi."}
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/10 transition-colors">
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
                          <td className="px-6 py-4 text-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(tx);
                                setIsInvoiceOpen(true);
                              }}
                              className="h-8 rounded-lg text-xs font-semibold">
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

        {/* SPANDUK PERINGATAN MASA AKTIF HAMPIR HABIS */}
        {showWarningBanner && (
          <Alert className="flex items-start gap-3 rounded-2xl border-amber-500/30 bg-amber-500/10 p-4 text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <AlertTitle className="font-bold text-amber-900">
                {locale === "English"
                  ? "Action Required: Plan Expiring Soon!"
                  : "Perhatian: Masa Aktif Paket Hampir Habis!"}
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
          <DialogContent className="border-border/80 max-h-[90vh] overflow-y-auto rounded-2xl border p-8 sm:max-w-[550px]">
            {selectedInvoice && (
              <div className="space-y-6">
                <div id="printable-invoice" className="space-y-6 print:p-0">
                  <div className="border-border/80 flex items-start justify-between border-b pb-6">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">INVOICE RECEIPT</h2>
                      <p className="text-muted-foreground mt-1 font-mono text-xs">
                        ID: #{selectedInvoice.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div className="text-end">
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
                    <div className="text-end">
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
                    <table className="w-full border-collapse text-start text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-border/60 text-muted-foreground border-b font-semibold uppercase">
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 text-end">Total</th>
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
                          <td className="px-4 py-4 text-end text-sm font-bold">
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

                <DialogFooter className="border-border/60 gap-2 border-t pt-4 sm:gap-0 print:hidden">
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
                    className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-1.5 rounded-xl">
                    Print / Save PDF
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* DIALOG MODAL CHECKOUT */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="border-border/80 rounded-2xl border sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t("dialogPurchase.title")}</DialogTitle>
              <DialogDescription>{t("dialogPurchase.desc")}</DialogDescription>
            </DialogHeader>

            {selectedPlan &&
              (() => {
                const { finalPrice, creditUsed } = getUpgradePrice(selectedPlan);
                const isUpgrade = getPlanActionType(selectedPlan.id) === "upgrade";

                return (
                  <div className="space-y-6 py-4">
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

                      {isUpgrade && creditUsed > 0 && (
                        <div className="flex items-center justify-between text-xs font-medium text-emerald-600">
                          <span>Prepaid Credit Applied</span>
                          <span>-{formatPrice(creditUsed)}</span>
                        </div>
                      )}

                      <div className="border-border/60 text-foreground flex items-center justify-between border-t pt-2 text-base font-bold">
                        <span>Amount to Pay</span>
                        <span>{formatPrice(finalPrice)}</span>
                      </div>

                      {billingCycle === "yearly" && (
                        <div className="text-muted-foreground text-end text-[10px] italic">
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
          <DialogContent className="border-border/80 rounded-2xl border sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t("dialogRefund.title")}</DialogTitle>
              <DialogDescription>
                {t("dialogRefund.desc", { planName: activeSub?.planName || "" })}
              </DialogDescription>
            </DialogHeader>

            <div className="text-muted-foreground space-y-4 py-3 text-sm leading-relaxed">
              <p>{t("dialogRefund.warn1")}</p>
              <p className="rounded-xl border border-dashed border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-500">
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
    </PayPalScriptProvider>
  );
}
