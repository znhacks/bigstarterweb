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
  Ban
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Impor klien Supabase & Global Language Hook
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/providers/language-provider";

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

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

// 1. KAMUS TERJEMAHAN MULTI-BAHASA KHUSUS SUPERADMIN BILLING (Mendukung 3 Bahasa)
const superadminBillingTranslations = {
  English: {
    title: "Superadmin Billing",
    subTitle: "Global overview of transactions, active subscriptions, and refund requests.",
    kpis: {
      revenue: "Total Revenue",
      active: "Active Subscriptions",
      refunds: "Pending Refunds"
    },
    tabs: {
      refunds: "Refund Requests",
      active: "Active Subscriptions",
      history: "Transaction History"
    },
    placeholders: {
      noRefunds: "No pending refund requests found.",
      noActive: "No active subscriptions found.",
      noTransactions: "No transactions found.",
      refundAmount: "Refund amount",
      expiry: "Expiry date",
      renewOff: "(Auto-renew off)",
      unlimited: "Unlimited",
      purchasedOn: "Purchased {planName} on {date}"
    },
    buttons: {
      reject: "Reject Refund",
      approve: "Approve & Terminate"
    },
    alerts: {
      approveTitle: "Refund Approved",
      approveDesc:
        "Refund claim approved. The associated organization account has been automatically downgraded to the Free Plan.",
      rejectTitle: "Refund Rejected",
      rejectDesc:
        "Refund request rejected. The organization's premium access has been reactivated.",
      failed: "Action Failed"
    }
  },
  "Bahasa Indonesia": {
    title: "Keuangan Superadmin",
    subTitle: "Ikhtisar global transaksi, langganan aktif, dan permintaan pengembalian dana.",
    kpis: {
      revenue: "Total Pendapatan",
      active: "Langganan Aktif",
      refunds: "Pending Refund"
    },
    tabs: {
      refunds: "Permintaan Refund",
      active: "Langganan Aktif",
      history: "Riwayat Transaksi"
    },
    placeholders: {
      noRefunds: "Tidak ada permintaan refund tertunda.",
      noActive: "Tidak ada langganan aktif ditemukan.",
      noTransactions: "Tidak ada transaksi ditemukan.",
      refundAmount: "Nominal refund",
      expiry: "Tanggal kadaluarsa",
      renewOff: "(Perpanjangan otomatis mati)",
      unlimited: "Tidak terbatas",
      purchasedOn: "Membeli paket {planName} pada tanggal {date}"
    },
    buttons: {
      reject: "Tolak Refund",
      approve: "Setujui & Hentikan"
    },
    alerts: {
      approveTitle: "Refund Disetujui",
      approveDesc:
        "Pengajuan refund disetujui. Akun organisasi terkait otomatis diturunkan kembali ke Paket Free.",
      rejectTitle: "Refund Ditolak",
      rejectDesc:
        "Pengajuan refund ditolak. Akses premium organisasi tersebut telah diaktifkan kembali.",
      failed: "Tindakan Gagal"
    }
  },
  Español: {
    title: "Facturación de Superadmin",
    subTitle:
      "Descripción global de transacciones, suscripciones activas y solicitudes de reembolso.",
    kpis: {
      revenue: "Ingresos Totales",
      active: "Suscripciones Activas",
      refunds: "Reembolsos Pendientes"
    },
    tabs: {
      refunds: "Solicitudes de Reembolso",
      active: "Suscripciones Activas",
      history: "Historial de Transacciones"
    },
    placeholders: {
      noRefunds: "No se encontraron solicitudes de reembolso pendientes.",
      noActive: "No se encontraron suscripciones activas.",
      noTransactions: "No se encontraron transacciones.",
      refundAmount: "Monto de reembolso",
      expiry: "Fecha de caducidad",
      renewOff: "(Renovación automática desactivada)",
      unlimited: "Ilimitado",
      purchasedOn: "Compró el plan {planName} el {date}"
    },
    buttons: {
      reject: "Rechazar Reembolso",
      approve: "Aprobar y Terminar"
    },
    alerts: {
      approveTitle: "Reembolso Aprobado",
      approveDesc:
        "Solicitud de reembolso aprobada. La cuenta de la organización asociada se ha degradado automáticamente al Plan Gratis.",
      rejectTitle: "Reembolso Rechazado",
      rejectDesc:
        "Solicitud de reembolso rechazada. Se ha reactivado el acceso premium de la organización.",
      failed: "Acción Fallida"
    }
  }
};

export default function SuperadminBillingDashboard() {
  const { language, formatPrice } = useLanguage();

  // Membaca kamus terjemahan aktif
  const tAdmin =
    superadminBillingTranslations[language] || superadminBillingTranslations["English"];

  // State Data Global
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

  // Memuat seluruh data transaksi & langganan global dari database Supabase
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

      // Hitung Total Pendapatan (Hanya menghitung transaksi berstatus 'completed')
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

      // Filter langganan aktif
      const activeSubs = subs.filter((sub) => sub.status === "active");
      setSubscriptions(activeSubs);
      setActiveSubsCount(activeSubs.length);

      // Filter khusus pengajuan refund
      const refunds = subs.filter((sub) => sub.status === "refund_requested");
      setRefundRequests(refunds);
    }
  };

  // Handler: Setujui Klaim Refund (Ubah status langganan ke 'inactive' dan batalkan tagihan)
  const handleApproveRefund = async (
    subId: string,
    tenantId: string,
    planName: string,
    amount: number
  ) => {
    setIsProcessingAction(subId);
    try {
      // 1. Nonaktifkan paket berlangganan penyewa di database
      const { error: subError } = await supabase
        .from("subscriptions")
        .update({ status: "inactive" })
        .eq("id", subId);

      if (subError) throw subError;

      // 2. Catat transaksi baru bermata uang minus untuk pencatatan refund sukses
      const { error: txError } = await supabase.from("transactions").insert({
        tenant_id: tenantId,
        amount: -amount, // Nominal minus untuk mengurangi Total Revenue
        plan_name: planName,
        order_id: `REFUND-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        status: "refunded"
      });

      if (txError) throw txError;

      setAlertMessage({
        title: tAdmin.alerts.approveTitle,
        description: tAdmin.alerts.approveDesc,
        variant: "default"
      });

      await loadSuperadminData();
    } catch (e: any) {
      setAlertMessage({
        title: tAdmin.alerts.failed,
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingAction(null);
    }
  };

  // Handler: Tolak Klaim Refund (Kembalikan status langganan penyewa ke 'active' semula)
  const handleRejectRefund = async (subId: string) => {
    setIsProcessingAction(subId);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("id", subId);

      if (error) throw error;

      setAlertMessage({
        title: tAdmin.alerts.rejectTitle,
        description: tAdmin.alerts.rejectDesc,
        variant: "default"
      });

      await loadSuperadminData();
    } catch (e: any) {
      setAlertMessage({
        title: tAdmin.alerts.failed,
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
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      {/* Header Dashboard */}
      <div className="space-y-1">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{tAdmin.title}</h1>
        <p className="text-muted-foreground text-sm">{tAdmin.subTitle}</p>
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
                {tAdmin.kpis.revenue}
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
                {tAdmin.kpis.active}
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
                {tAdmin.kpis.refunds}
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
                {tAdmin.tabs.refunds} ({refundRequests.length})
              </TabsTrigger>
              <TabsTrigger
                value="subscriptions"
                className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-semibold shadow-none transition-all data-[state=active]:bg-transparent">
                {tAdmin.tabs.active} ({subscriptions.length})
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-semibold shadow-none transition-all data-[state=active]:bg-transparent">
                {tAdmin.tabs.history} ({transactions.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB CONTENT 1: REFUND REQUESTS */}
            <TabsContent value="refunds" className="mt-0 space-y-4 focus-visible:outline-none">
              {refundRequests.length === 0 ? (
                <div className="text-muted-foreground py-10 text-center text-sm">
                  {tAdmin.placeholders.noRefunds}
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
                          {tAdmin.placeholders.refundAmount}:{" "}
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
                        {tAdmin.buttons.reject}
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
                        {tAdmin.buttons.approve}
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
                  {tAdmin.placeholders.noActive}
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
                          {tAdmin.placeholders.expiry}:{" "}
                          <strong className="text-foreground">
                            {sub.ends_at
                              ? new Date(sub.ends_at).toLocaleDateString("id-ID")
                              : tAdmin.placeholders.unlimited}
                          </strong>{" "}
                          {sub.cancel_at_period_end && (
                            <span className="text-red-500">{tAdmin.placeholders.renewOff}</span>
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
                  {tAdmin.placeholders.noTransactions}
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
                          {tAdmin.placeholders.purchasedOn
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
