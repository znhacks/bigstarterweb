import { getTranslations } from "next-intl/server";
import { SuperadminTransactionsPage } from "./view";
import { constructMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.billing.history-transactions");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <SuperadminTransactionsPage />;
}
