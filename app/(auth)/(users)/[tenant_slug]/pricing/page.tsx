import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { OrganizationBilling } from "./view";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/modules/rbac/shared";

export async function generateMetadata() {
  const t = await getTranslations("metadata.users.organization.billing");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

interface PageProps {
  params: Promise<{ tenant_slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenant_slug } = await params;
  await requirePermission(PERMISSIONS.billingRead, tenant_slug);
  return <OrganizationBilling />;
}
