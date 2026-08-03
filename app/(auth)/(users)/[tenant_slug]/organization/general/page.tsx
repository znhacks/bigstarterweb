import { getTranslations } from "next-intl/server";
import { OrganizationGeneralSettings } from "./view";
import { constructMetadata } from "@/lib/metadata";
import { requireOrgRoute } from "@/lib/auth";

export async function generateMetadata() {
  const t = await getTranslations("metadata.users.organization.general");

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
  // Gate baseline: harus jadi member organisasi ini (hierarchy >= 10).
  await requireOrgRoute("general", tenant_slug);
  return <OrganizationGeneralSettings />;
}
