import { constructMetadata } from "@/lib/metadata";
import { OrganizationMembers } from "./view";
import { getTranslations } from "next-intl/server";
import { requireOrgRoute } from "@/lib/auth";

export async function generateMetadata() {
  const t = await getTranslations("metadata.users.organization.member");

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
  // Hanya Admin+ (hierarchy >= 50) yang boleh mengelola member.
  await requireOrgRoute("member", tenant_slug);
  return <OrganizationMembers />;
}
