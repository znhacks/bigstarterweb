// app/(auth)/(users)/[tenant_slug]/organization/appearance/page.tsx
import { requireOrgRoute } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { TenantAppearanceView } from "./view";

interface PageProps {
  params: Promise<{ tenant_slug: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations("settings.appearance");
  return constructMetadata({ title: t("title"), description: t("desc") });
}

export default async function Page({ params }: PageProps) {
  const { tenant_slug } = await params;
  // Tampilan organisasi hanya boleh diubah Owner (hierarchy >= 100).
  // Sebelumnya di-gate via permission `organizationUpdate` — tapi role Admin
  // juga memegang permission itu, sehingga bertentangan dengan aturan role.
  const ctx = await requireOrgRoute("appearance", tenant_slug);
  return <TenantAppearanceView tenantId={ctx.tenant.id} tenantName={ctx.tenant.name} />;
}
