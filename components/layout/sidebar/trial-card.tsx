import * as React from "react";
import Link from "next/link";
import { Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TrialCardProps {
  slug: string;
  subscription: { status: string } | null;
  trialRemaining: string;
  isTrialExpired: boolean;
  isLoading: boolean;
}

export function TrialCard({
  slug,
  subscription,
  trialRemaining,
  isTrialExpired,
  isLoading
}: TrialCardProps) {
  // Jika sedang memuat status trial atau langganan tidak ada, jangan tampilkan apa pun
  if (isLoading || !subscription) return null;

  const isTrialActive = subscription.status === "trialing" && !isTrialExpired && trialRemaining;
  const isExpired = isTrialExpired || subscription.status === "expired";

  // 1. Tampilan ketika Trial Masih Aktif
  if (isTrialActive) {
    return (
      <div className="mb-2 px-3 py-1 group-data-[collapsible=icon]:hidden">
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900/30 dark:bg-amber-950/15">
          <CardContent className="p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" />
                  Trial Aktif
                </span>
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-100 px-1.5 py-0 text-[9px] font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                  Uji Coba
                </Badge>
              </div>
              <div className="text-muted-foreground text-[11px] leading-normal">
                Sisa waktu:{" "}
                <span className="font-bold text-amber-900 dark:text-amber-300">
                  {trialRemaining}
                </span>
              </div>
              <Button
                asChild
                size="sm"
                className="h-7 w-full border-none bg-amber-600 text-[11px] font-semibold text-white shadow-none hover:bg-amber-700">
                <Link href={`/${slug}/organization/billing`}>Upgrade Paket</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Tampilan ketika Trial Habis / Expired
  if (isExpired) {
    return (
      <div className="mb-2 px-3 py-1 group-data-[collapsible=icon]:hidden">
        <Card className="py-0">
          <CardContent className="p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-bold text-red-800 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                  Trial Habis
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Masa uji coba gratis organisasi Anda telah berakhir. Upgrade untuk memulihkan akses
                fitur.
              </p>
              <Button
                asChild
                size="sm"
                variant="destructive"
                className="h-7 w-full text-[11px] font-semibold">
                <Link href={`/${slug}/organization/billing`}>Upgrade Sekarang</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
