// app/(auth)/(users)/[tenant_slug]/organization/billing/history/page.tsx

import { getTranslations } from "next-intl/server";
import { BillingHistory } from "./view";
import { constructMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getTranslations("metadata.users.organization.history-billing");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function BillingHistoryPage() {
  return <BillingHistory />;
}
