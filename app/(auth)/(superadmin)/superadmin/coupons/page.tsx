import { getTranslations } from "next-intl/server";
import { AdminCouponsPage } from "./view";
import { constructMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.coupons");

  return constructMetadata({
    title: t("title"),
    description: t("description")
  });
}

export default function Page() {
  return <AdminCouponsPage />;
}
