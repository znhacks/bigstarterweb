import React from "react";
import { requireAuth, getUser } from "@/lib/auth";
import { CreateTenantForm } from "@/components/create-tenant-form";
import { getTranslations } from "next-intl/server"; // Menggunakan getTranslations untuk Server Component
import { constructMetadata } from "@/lib/metadata";
import { tenantConfig } from "@/config/tenant";

export async function generateMetadata() {
  const t = await getTranslations("metadata.guest.create-tenant");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default async function CreateTenantPage() {
  // PERBAIKAN: Ubah useTranslations menjadi await getTranslations
  const t = await getTranslations("guest.create-tenant");

  // Wajibkan autentikasi sesi sebelum masuk halaman ini
  await requireAuth();

  // Gate: bila user tak boleh create org → hanya superadmin. Non-superadmin
  // mendapat pesan "perlu diundang" (TIDAK redirect → hindari loop dgn middleware).
  if (!tenantConfig.organizations.enableUsersToCreateOrganizations) {
    const user = await getUser();
    const isSuperadmin = user?.app_metadata?.role === "superadmin";
    if (!isSuperadmin) {
      return (
        <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-md space-y-4 rounded-md border bg-white p-8 text-center">
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
    <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-md border bg-white p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("desc")}</p>
        </div>
        <CreateTenantForm />
      </div>
    </div>
  );
}
