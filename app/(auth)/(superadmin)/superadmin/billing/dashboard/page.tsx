import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { SuperadminBillingDashboard } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.billing.billing-dashboard");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <SuperadminBillingDashboard />;
}
