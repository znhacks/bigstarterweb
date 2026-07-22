import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { SuperadminMainDashboard } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.dashboard");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <SuperadminMainDashboard />;
}
