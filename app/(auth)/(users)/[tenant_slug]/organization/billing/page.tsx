import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { OrganizationBilling } from "./view";
import { requireRole } from "@/lib/auth";

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
  const { tenant, role } = await requireRole(["Owner"], tenant_slug);
  return <OrganizationBilling />;
}
