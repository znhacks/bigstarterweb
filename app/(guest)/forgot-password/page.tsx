import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import ForgotPasswordForm from "./view";

export async function generateMetadata() {
  const t = await getTranslations("metadata.forgot-password");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <ForgotPasswordForm />;
}
