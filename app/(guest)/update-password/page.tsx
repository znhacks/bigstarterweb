import { constructMetadata } from "@/lib/metadata";
import { UpdatePasswordPage } from "./view";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("metadata.guest.update-password");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <UpdatePasswordPage />;
}
