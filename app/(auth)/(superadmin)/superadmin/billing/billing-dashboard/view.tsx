"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, DollarSign, CreditCard, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Impor klien Supabase, Global Language Hook
import { supabase } from "@/lib/supabase";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/i18n/currency";

export function SuperadminBillingDashboard() {
  const locale = useLocale();
  const t = useTranslations("superadmin.billing");

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeSubsCount, setActiveSubsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Formatter harga lokal
  const formatPrice = (amount: number, currency?: string) =>
    formatCurrency(amount, locale, { currencyCode: currency ?? "IDR" });

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchRevenueMetric(), fetchActiveSubsMetric()]);
    } catch (e) {
      console.error("Gagal memuat data metrik overview:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRevenueMetric = async () => {
    const { data, error } = await supabase.from("transactions").select("amount_in_idr, status");

    if (error) throw error;

    if (data) {
      const PAID = ["paid", "completed"];
      const total = data
        .filter((tx) => PAID.includes(tx.status?.toLowerCase()) && tx.amount_in_idr != null)
        .reduce((sum, tx) => sum + (tx.amount_in_idr ?? 0), 0);
      setTotalRevenue(total);
    }
  };

  const fetchActiveSubsMetric = async () => {
    const { count, error } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    if (error) throw error;
    setActiveSubsCount(count || 0);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-8 px-4 py-10">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subTitle")}</p>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
      </div>

      {/* QUICK NAVIGATION SECTION */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Kelola Langganan</CardTitle>
            <CardDescription>
              Lihat dan pantau masa aktif langganan, plan, serta status dari tiap penyewa (tenant).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/superadmin/billing/subscriptions">
                Buka Daftar Langganan
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Riwayat Transaksi</CardTitle>
            <CardDescription>
              Pantau seluruh riwayat invoice masuk, status pembayaran, serta rincian dana transaksi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/superadmin/billing/transactions">
                Buka Riwayat Transaksi
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
