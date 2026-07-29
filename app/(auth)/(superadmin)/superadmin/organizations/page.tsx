import { getTranslations } from "next-intl/server";
import { SuperadminOrganizationsPage } from "./view";
import { constructMetadata } from "@/lib/metadata";
import { getSuperadminOrganizations } from "./action";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.organizations");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default async function Page() {
  const data = await getSuperadminOrganizations();
  return <SuperadminOrganizationsPage data={data} />;
}
