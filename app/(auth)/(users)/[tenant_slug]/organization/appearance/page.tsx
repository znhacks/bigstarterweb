// app/(auth)/(users)/[tenant_slug]/organization/appearance/page.tsx
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
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
  const ctx = await requirePermission(PERMISSIONS.organizationUpdate, tenant_slug);
  return <TenantAppearanceView tenantId={ctx.tenant.id} tenantName={ctx.tenant.name} />;
}
