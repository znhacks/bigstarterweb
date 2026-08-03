import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { getNotificationAction } from "../action";
import { NotificationDetailView } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("notifications");
  return constructMetadata({ title: t("inbox.title"), description: t("inbox.title") });
}

export default async function Page({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getNotificationAction(id);
  if (!item) notFound();
  return <NotificationDetailView item={item} />;
}
