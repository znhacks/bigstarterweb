// app/(auth)/(users)/settings/appearance/page.tsx
import { requireAuth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { AppearanceView } from "./view";

export async function generateMetadata() {
  const t = await getTranslations("settings.appearance");
  return constructMetadata({ title: t("title"), description: t("desc") });
}

export default async function Page() {
  await requireAuth();
  return <AppearanceView />;
}
