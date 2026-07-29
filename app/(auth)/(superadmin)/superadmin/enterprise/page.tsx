import { getTranslations } from "next-intl/server";
import { SuperadminEnterprisePage } from "./view";
import { constructMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.enterprise");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <SuperadminEnterprisePage />;
}
