import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { InboxView } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("notifications");
  return constructMetadata({ title: t("inbox.title"), description: t("inbox.title") });
}

export default function Page() {
  return <InboxView />;
}
