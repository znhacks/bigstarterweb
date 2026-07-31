import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { getNotificationCategories } from "../action";
import { PreferencesView } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.notifications.preferences");
  return constructMetadata({ title: t("title"), description: t("description") });
}

export default async function Page() {
  const categories = await getNotificationCategories();
  return <PreferencesView categories={categories} />;
}
