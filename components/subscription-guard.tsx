"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { billingConfig } from "@/config/payment";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">(
    billingConfig.requireActiveSubscription ? "loading" : "ok"
  );

  useEffect(() => {
    if (!billingConfig.requireActiveSubscription) {
      setStatus("ok");
      return;
    }

    if (pathname.includes("/organization")) {
      setStatus("ok");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const orgId = typeof window !== "undefined" ? localStorage.getItem("active_org_id") : null;
        if (!orgId) {
          if (!cancelled) setStatus("denied");
          return;
        }
        const { data } = await supabase
          .from("subscriptions")
          .select("status, ends_at")
          .eq("tenant_id", orgId)
          .maybeSingle();

        const endsAt = data?.ends_at ? new Date(data.ends_at) : null;
        const isExpired = endsAt ? new Date() > endsAt : false;
        const activeLike =
          !!data && (data.status === "active" || data.status === "trialing") && !isExpired;

        if (!cancelled) setStatus(activeLike ? "ok" : "denied");
      } catch {
        if (!cancelled) setStatus("denied");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (status === "ok") return <>{children}</>;

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <Card className="border border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex flex-col items-center space-y-3 p-8 text-center">
          <ShieldAlert className="h-10 w-10 animate-pulse text-amber-600" />
          <h2 className="text-lg font-bold">Langganan diperlukan</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Aplikasi ini memerlukan langganan aktif untuk diakses. Silakan berlangganan untuk
            melanjutkan.
          </p>
          <Button asChild className="mt-2">
            <Link href="/organization/billing">Berlangganan Sekarang</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
