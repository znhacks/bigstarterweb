import React from "react";
import { requireAuth } from "@/lib/auth";
import { CreateTenantForm } from "@/components/create-tenant-form";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { useTranslations } from "next-intl";

export async function generateMetadata() {
  const t = await getTranslations("metadata.guest.create-tenant");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default async function CreateTenantPage() {
  const t = useTranslations("guest.create-tenant");
  // Wajibkan autentikasi sesi sebelum masuk halaman ini
  await requireAuth();

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
