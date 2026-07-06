import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { SecuritySettingsPage } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("metadata.users.settings.security");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <SecuritySettingsPage />;
}
