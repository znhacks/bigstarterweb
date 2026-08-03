// app/(auth)/(users)/[tenant_slug]/organization/billing/history/page.tsx

import { getTranslations } from "next-intl/server";
import { BillingHistory } from "./view";
import { constructMetadata } from "@/lib/metadata";
import { requireOrgRoute } from "@/lib/auth";

export async function generateMetadata() {
  const t = await getTranslations("metadata.users.organization.history-billing");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

interface PageProps {
  params: Promise<{ tenant_slug: string }>;
}

export default async function BillingHistoryPage({ params }: PageProps) {
  const { tenant_slug } = await params;
  // Riwayat pembayaran hanya untuk Owner (hierarchy >= 100).
  await requireOrgRoute("history-billing", tenant_slug);
  return <BillingHistory />;
}
