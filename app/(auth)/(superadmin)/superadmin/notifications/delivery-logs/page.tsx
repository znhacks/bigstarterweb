import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { getDeliveryLogs } from "../action";
import { DeliveryLogsView } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.notifications.delivery-logs");
  return constructMetadata({ title: t("title"), description: t("description") });
}

export const dynamic = "force-dynamic";

export default async function Page() {
  const logs = await getDeliveryLogs();
  return <DeliveryLogsView logs={logs} />;
}
