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
  Calendar
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
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "@/lib/supabase";

interface Plan {
  id?: string;
  name: string;
  desc: string;
  price: number;
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
  planName: string;
  price: number;
  endsAt: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
}

export default function OrganizationBilling() {
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);

  // State Langganan Aktif
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    const orgId = localStorage.getItem("active_org_id");
    if (orgId) {
      setActiveOrgId(orgId);
      fetchActiveSubscription(orgId);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchActiveSubscription = async (orgId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          `
          id,
          status,
          ends_at,
          cancel_at_period_end,
          plans (
            name,
            price
          )
        `
        )
        .eq("tenant_id", orgId)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;

      if (data && data.plans) {
        const planInfo = data.plans as any;
        setActiveSub({
          id: data.id,
          planName: planInfo.name,
          price: planInfo.price,
          endsAt: data.ends_at,
          status: data.status,
          cancelAtPeriodEnd: !!data.cancel_at_period_end
        });
      } else {
        setActiveSub(null);
      }
    } catch (error: any) {
      console.error("Gagal memuat detail langganan:", error?.message || error);
    } finally {
      setIsLoading(false);
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

  const plans: Plan[] = [
    {
      name: "Starter",
      desc: "For projects moving into production.",
      price: billingCycle === "monthly" ? 19 : 15,
      buttonVariant: "secondary",
      buttonClass: "bg-secondary text-foreground hover:bg-secondary/80",
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
    {
      name: "Pro",
      desc: "For production workloads at higher volume.",
      price: billingCycle === "monthly" ? 79 : 63,
      buttonVariant: "default",
      buttonClass: "bg-foreground text-background hover:bg-foreground/90",
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
    {
      name: "Enterprise",
      desc: "For large-scale deployments and custom requirements.",
      price: billingCycle === "monthly" ? 319 : 255,
      buttonVariant: "secondary",
      buttonClass: "bg-secondary text-foreground hover:bg-secondary/80",
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
  ];

  const getFinalPrice = (pricePerMonth: number) => {
    return billingCycle === "yearly" ? pricePerMonth * 12 : pricePerMonth;
  };

  const handleChoosePlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsCheckoutOpen(true);
  };

  // Fungsi memproses pembatalan paket berlangganan (Cancellation)
  const handleCancelSubscription = async () => {
    if (!activeSub || !activeOrgId) return;
    setIsUpdatingSub(true);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: true }) // Set penangguhan pembatalan di akhir masa jatuh tempo
        .eq("id", activeSub.id);

      if (error) throw error;

      setAlertMessage({
        title: "Subscription Cancelled",
        description:
          "Langganan Anda telah dibatalkan namun tetap dapat digunakan hingga masa aktif berakhir.",
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

  // Fungsi mengaktifkan kembali paket langganan yang sempat dibatalkan
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
        description: "Langganan Anda berhasil diaktifkan kembali secara otomatis.",
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

  const handlePaymentSuccess = async (details: any) => {
    if (!activeOrgId || !selectedPlan) return;

    const finalAmount = getFinalPrice(selectedPlan.price);

    try {
      let { data: planData } = await supabase
        .from("plans")
        .select("id")
        .eq("name", selectedPlan.name)
        .maybeSingle();

      if (!planData) {
        const { data: newPlan } = await supabase
          .from("plans")
          .insert({ name: selectedPlan.name, price: selectedPlan.price, type: billingCycle })
          .select("id")
          .single();
        planData = newPlan;
      }

      const planId = planData?.id;

      const { error: txError } = await supabase.from("transactions").insert({
        tenant_id: activeOrgId,
        amount: finalAmount,
        plan_name: selectedPlan.name,
        order_id: details.id,
        status: "completed"
      });

      if (txError) throw txError;

      const endsAt = new Date();
      if (billingCycle === "yearly") {
        endsAt.setFullYear(endsAt.getFullYear() + 1);
      } else {
        endsAt.setMonth(endsAt.getMonth() + 1);
      }

      const { error: subError } = await supabase.from("subscriptions").upsert(
        {
          tenant_id: activeOrgId,
          plan_id: planId,
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

  // Helper untuk menentukan relasi perbandingan paket (Upgrade/Downgrade/Active)
  const getPlanActionType = (planName: string) => {
    if (!activeSub) return "choose";
    if (activeSub.planName === planName) return "active";

    const planWeights: Record<string, number> = { Starter: 1, Pro: 2, Enterprise: 3 };
    const currentWeight = planWeights[activeSub.planName] || 0;
    const targetWeight = planWeights[planName] || 0;

    return targetWeight > currentWeight ? "upgrade" : "downgrade";
  };

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
    <PayPalScriptProvider options={{ "client-id": "test", currency: "USD" }}>
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
                      {activeSub ? activeSub.planName : "Free"}
                    </h3>
                    <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/15">
                      ACTIVE
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {activeSub
                      ? `Langganan aktif senilai $${activeSub.price}/bulan. ${
                          activeSub.endsAt
                            ? `Berakhir pada tanggal ${new Date(activeSub.endsAt).toLocaleDateString("id-ID")}`
                            : ""
                        }`
                      : "For testing and hobby use."}
                  </p>
                </div>

                {/* AREA MANAGEMENT PEMBATALAN LANGGANAN */}
                {activeSub && (
                  <div className="flex shrink-0 gap-3">
                    {activeSub.cancelAtPeriodEnd ? (
                      <Button
                        onClick={handleResumeSubscription}
                        disabled={isUpdatingSub}
                        variant="outline"
                        className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-xs font-semibold">
                        {isUpdatingSub ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Calendar className="h-4 w-4" />
                        )}
                        Aktifkan Kembali Langganan
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCancelSubscription}
                        disabled={isUpdatingSub}
                        variant="destructive"
                        className="h-10 rounded-xl px-5 text-xs font-semibold">
                        {isUpdatingSub && <Loader2 className="h-4 w-4 animate-spin" />}
                        Batalkan Langganan
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Rincian Fitur Dinamis berdasarkan Plan Aktif */}
              <ul className="text-foreground/90 max-w-2xl space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    {activeSub?.planName === "Enterprise"
                      ? "50,000"
                      : activeSub?.planName === "Pro"
                        ? "10,000"
                        : activeSub?.planName === "Starter"
                          ? "2,000"
                          : "200"}{" "}
                    screenshots per month
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    {activeSub?.planName === "Enterprise"
                      ? "160"
                      : activeSub?.planName === "Pro"
                        ? "80"
                        : activeSub?.planName === "Starter"
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

                {!activeSub ? (
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
                  ${activeSub ? activeSub.price : "0"}
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
                        <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                        <span className="text-muted-foreground text-sm">
                          / month {billingCycle === "yearly" && " (billed yearly)"}
                        </span>
                      </div>
                    </div>

                    {/* DYNAMIC UPGRADE / DOWNGRADE ACTION BUTTONS */}
                    {actionType === "active" ? (
                      <Button
                        disabled
                        className="w-full cursor-default rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-5 font-semibold text-emerald-600 hover:bg-emerald-500/10">
                        Plan Aktif
                      </Button>
                    ) : actionType === "upgrade" ? (
                      <Button
                        onClick={() => handleChoosePlan(plan)}
                        className="bg-foreground text-background hover:bg-foreground/90 inline-flex w-full items-center gap-1.5 rounded-xl py-5 font-semibold">
                        <ArrowUpRight className="h-4 w-4" />
                        Upgrade Plan
                      </Button>
                    ) : actionType === "downgrade" ? (
                      <Button
                        onClick={() => handleChoosePlan(plan)}
                        variant="outline"
                        className="border-border/80 hover:bg-accent inline-flex w-full items-center gap-1.5 rounded-xl py-5 font-semibold">
                        <ArrowDown className="h-4 w-4" />
                        Downgrade Plan
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleChoosePlan(plan)}
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
      </div>
    </PayPalScriptProvider>
  );
}
