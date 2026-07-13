import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { JoinOrganization } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("metadata.guest.join");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <JoinOrganization />;
}
