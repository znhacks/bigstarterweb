import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import ForgotPasswordForm from "./view";
import { AUTH_FEATURES } from "@/config/auth";

export async function generateMetadata() {
  const t = await getTranslations("metadata.guest.forgot-password");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  if (!AUTH_FEATURES.enablePasswordReset) {
    redirect("/login");
  }
  return <ForgotPasswordForm />;
}
