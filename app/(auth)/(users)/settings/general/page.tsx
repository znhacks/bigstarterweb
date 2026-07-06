import { GeneralSettingsPage } from "./view";
import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("metadata.users.settings.general");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <GeneralSettingsPage />;
}
