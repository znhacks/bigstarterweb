import { getTranslations } from "next-intl/server";
import { OrganizationGeneralSettings } from "./view";
import { constructMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getTranslations("metadata.users.organization.general");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <OrganizationGeneralSettings />;
}
