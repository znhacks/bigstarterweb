import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { OrganizationBilling } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("metadata.users.organization.billing");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <OrganizationBilling />;
}
