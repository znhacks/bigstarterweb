"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { billingConfig } from "@/config/payment";

interface PaywallGateProps {
  children: React.ReactNode;
  allowedPlans: string[]; // Contoh: ["starter", "pro"]
  fallback?: React.ReactNode;
}

export function PaywallGate({ children, allowedPlans, fallback }: PaywallGateProps) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const t = useTranslations();

  useEffect(() => {
    const checkAccess = async () => {
      const orgId = localStorage.getItem("active_org_id");
      if (!orgId) {
        setLoading(false);
        return;
      }

      const subscriptionRepo = await subscriptionRepository(supabase);

      try {
        const { data, error } = await subscriptionRepo
          .query()
          .select("id, plan_id, status, ends_at")
          .eq("tenant_id", orgId)
          .maybeSingle();

        if (error) throw error;

        // Ambil ID paket aktif dari database, jika tidak ada fallback ke "free"
        const endsAt = data?.ends_at ? new Date(data.ends_at) : null;
        const isExpired = endsAt ? new Date() > endsAt : false;

        // --- INTEGRASI LAZY EXPIRATION (DEGRADASI OTOMATATIS) ---
        // Jika masa berlaku habis tetapi status di database masih 'active'/'trialing',
        // perbarui ke 'expired' secara asinkron di latar belakang.
        if (isExpired && data && (data.status === "active" || data.status === "trialing")) {
          subscriptionRepo
            .query()
            .update({ status: "expired" })
            .eq("id", data.id)
            .then(({ error }) => {
              if (error) {
                console.error("Gagal mengubah status langganan kedaluwarsa:", error);
              }
            });
        }

        // "active" & "trialing" (trial free-window) dianggap aktif sampai ends_at.
        const isActiveLike =
          !!data && (data.status === "active" || data.status === "trialing") && !isExpired;

        // Otorisasi:
        //  - sub aktif → cek plan di allowedPlans
        //  - tanpa sub aktif & requireActiveSubscription → tolak (tidak ada free plan)
        //  - tanpa sub aktif & mode free → boleh jika "free" masuk allowedPlans
        let isAuthorized: boolean;
        if (isActiveLike) {
          isAuthorized = allowedPlans.includes(data?.plan_id || "free");
        } else if (billingConfig.requireActiveSubscription) {
          isAuthorized = false;
        } else {
          isAuthorized = allowedPlans.includes("free");
        }

        setHasAccess(isAuthorized);
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
          <h3 className="text-sm font-semibold">{t("title")}</h3>
          <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">
            {t("planRequired", {
              plans: allowedPlans.join(" / ")
            })}
          </p>
        </div>
        <Button asChild size="sm" className="h-8 rounded-lg text-xs font-semibold">
          <Link href="/organization/billing">{t("upgradenow")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
