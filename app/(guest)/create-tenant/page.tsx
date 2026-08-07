import React from "react";
import Link from "next/link";
import { requireAuth, getUser } from "@/lib/auth";
import { CreateTenantForm } from "@/components/create-tenant-form";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { tenantConfig } from "@/config/tenant";
import { getUserTenants } from "@/services/tenant";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export async function generateMetadata() {
  const t = await getTranslations("metadata.guest.create-tenant");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default async function CreateTenantPage() {
  const t = await getTranslations("guest.create-tenant");

  // Wajibkan autentikasi sesi sebelum masuk halaman ini
  await requireAuth();

  const existingTenants = await getUserTenants();

  // Gate: bila user tak boleh create org → hanya superadmin. Non-superadmin
  // mendapat pesan "perlu diundang" (TIDAK redirect → hindari loop dgn middleware).
  if (!tenantConfig.organizations.enableUsersToCreateOrganizations) {
    const user = await getUser();
    const isSuperadmin = user?.app_metadata?.role === "superadmin";
    if (!isSuperadmin) {
      return (
        <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-md space-y-4 rounded-md border bg-card p-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Anda perlu diundang</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Pembuatan organisasi dinonaktifkan. Hubungi administrator untuk diundang
              ke organisasi yang sudah ada, atau keluar dan masuk kembali dengan akun lain.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center p-4 space-y-4">
      {existingTenants.length > 0 && (
        <div className="w-full max-w-md p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate text-foreground font-medium">
              Anda terdaftar di <strong className="font-bold">{existingTenants[0].tenant.name}</strong>
            </span>
          </div>
          <Button asChild size="sm" variant="default" className="h-8 text-xs shrink-0 font-medium">
            <Link href={`/${existingTenants[0].tenant.slug}/dashboard`}>
              <ArrowLeft className="me-1 h-3.5 w-3.5" /> Dashboard
            </Link>
          </Button>
        </div>
      )}

      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-6 sm:p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("desc")}</p>
        </div>
        <CreateTenantForm />
      </div>
    </div>
  );
}
