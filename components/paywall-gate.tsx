"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PaywallGateProps {
  children: React.ReactNode;
  allowedPlans: string[]; // Contoh: ["Pro", "Enterprise"]
  fallback?: React.ReactNode; // Tampilan alternatif jika tidak memiliki akses
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
          .select(
            `
            status,
            plans (
              name
            )
          `
          )
          .eq("tenant_id", orgId)
          .eq("status", "active")
          .maybeSingle();

        if (error) throw error;

        const activePlanName = data && data.plans ? (data.plans as any).name : "Free";

        if (allowedPlans.includes(activePlanName)) {
          setHasAccess(true);
        }
      } catch (e) {
        console.error("Gagal memeriksa paywall access:", e);
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

  // Jika tidak memiliki akses, tampilkan fallback kustom atau bawaan
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
          <Link href="/dashboard/organization/billing">Upgrade Sekarang</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
