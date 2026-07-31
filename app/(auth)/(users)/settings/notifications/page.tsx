import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { NotificationsPreferencesView } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("notifications");
  return constructMetadata({ title: t("preferences.title"), description: t("preferences.subtitle") });
}

export default function Page() {
  return <NotificationsPreferencesView />;
}
