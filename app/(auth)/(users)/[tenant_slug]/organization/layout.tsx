"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { CreditCard, Settings, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const tenantSlug = params?.tenant_slug as string | undefined;

  // Memeriksa status keaktifan menu berdasarkan URL organisasi yang baru
  const isGeneralActive = pathname?.includes("/organization/general");
  const isMembersActive = pathname?.includes("/organization/member");
  const isBillingActive = pathname?.includes("/organization/billing");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      {/* Header Halaman Utama */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground text-sm">
          Kelola informasi organisasi, anggota tim, dan penagihan Anda.
        </p>
      </div>

      {/* Grid Layout: Menu Samping & Slot Konten Anak */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        {/* Menu Samping */}
        <div className="md:col-span-1">
          <Card className="border-border/80 overflow-hidden rounded-2xl border p-2 shadow-sm">
            <nav className="flex flex-row gap-1 md:flex-col">
              {/* Menu General */}
              <Link
                href={`/${tenantSlug}/organization/general`}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isGeneralActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <Settings className="h-4 w-4 shrink-0" />
                <span>General</span>
              </Link>

              {/* Menu Members */}
              <Link
                href={`/${tenantSlug}/organization/member`}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isMembersActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <Users className="h-4 w-4 shrink-0" />
                <span>Members</span>
              </Link>

              {/* Menu Billing */}
              <Link
                href={`/${tenantSlug}/organization/billing`}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isBillingActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}>
                <CreditCard className="h-4 w-4 shrink-0" />
                <span>Billing</span>
              </Link>
            </nav>
          </Card>
        </div>

        {/* Konten Halaman Aktif */}
        <div className="md:col-span-3">{children}</div>
      </div>
    </div>
  );
}
