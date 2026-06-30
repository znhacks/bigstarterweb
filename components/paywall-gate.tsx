"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { plans } from "@/config/billing"; // Import konfigurasi statis

interface PaywallGateProps {
  children: React.ReactNode;
  allowedPlans: string[]; // Contoh: ["starter", "pro"]
  fallback?: React.ReactNode;
}

export function PaywallGate({ children, allowedPlans, fallback }: PaywallGateProps) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const orgId = localStorage.getItem("active_org_id");
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id, plan_id, status, ends_at")
          .eq("tenant_id", orgId)
          .maybeSingle();

        if (error) throw error;

        // Ambil ID paket aktif dari database, jika tidak ada fallback ke "free"
        const activePlanId = data?.plan_id || "free";
        const subscriptionStatus = data?.status || "active";
        const endsAt = data?.ends_at ? new Date(data.ends_at) : null;
        const isExpired = endsAt ? new Date() > endsAt : false;

        // --- INTEGRASI LAZY EXPIRATION (DEGRADASI OTOMATIS) ---
        // Jika masa berlaku habis tetapi status di database masih tertulis 'active',
        // kita perbarui statusnya ke 'expired' secara asinkron di latar belakang.
        if (isExpired && data && data.status === "active") {
          supabase
            .from("subscriptions")
            .update({ status: "expired" })
            .eq("id", data.id)
            .then(({ error }) => {
              if (error) {
                console.error("Gagal mengubah status langganan kedaluwarsa:", error);
              }
            });
        }

        // Cari konfigurasi paket di file statis
        // Jika statusnya sudah expired, paksa gunakan limit paket "free"
        const resolvedPlanId =
          subscriptionStatus === "expired" || isExpired ? "free" : activePlanId;
        const planConfig = plans.find((p) => p.id === resolvedPlanId);

        const isAuthorized =
          planConfig &&
          allowedPlans.includes(planConfig.id) &&
          subscriptionStatus === "active" &&
          !isExpired;

        setHasAccess(!!isAuthorized);
      } catch (e) {
        console.error("Gagal memeriksa paywall access:", e);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [allowedPlans]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return fallback ? (
    <>{fallback}</>
  ) : (
    <Card className="mx-auto max-w-md rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex flex-col items-center space-y-3 p-6 text-center">
        <ShieldAlert className="h-8 w-8 animate-pulse text-amber-600" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Fitur Premium Terkunci</h3>
          <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">
            Fitur ini hanya tersedia pada paket **{allowedPlans.join(" / ")}**. Silakan hubungi
            Owner atau tingkatkan paket Anda.
          </p>
        </div>
        <Button asChild size="sm" className="h-8 rounded-lg text-xs font-semibold">
          <Link href="/organization/billing">Upgrade Sekarang</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
