import { constructMetadata } from "@/lib/metadata";
import { OrganizationMembers } from "./view";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("metadata.users.organization.member");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <OrganizationMembers />;
}
