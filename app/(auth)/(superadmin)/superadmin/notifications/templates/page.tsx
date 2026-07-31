import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { getNotificationCategories, getNotificationTemplates } from "../action";
import { TemplatesView } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.notifications.templates");
  return constructMetadata({ title: t("title"), description: t("description") });
}

export default async function Page() {
  const [templates, categories] = await Promise.all([
    getNotificationTemplates(),
    getNotificationCategories()
  ]);
  return <TemplatesView templates={templates} categories={categories} />;
}
