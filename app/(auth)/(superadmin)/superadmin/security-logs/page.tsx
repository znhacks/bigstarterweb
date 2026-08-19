import { requireSuperadmin } from "@/lib/auth";
import { getSuperadminSecurityLogsAction } from "./actions";
import { SuperadminSecurityLogsView } from "./view";
import { getLocale } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("metadata.superadmin.security");
  // Assuming a generic title fallback if not found, or use the existing pattern.
  return constructMetadata({ title: "Security Logs", description: "Monitor security logs" });
}

export default async function SuperadminSecurityLogsPage() {
  await requireSuperadmin();
  const data = await getSuperadminSecurityLogsAction();
  const locale = await getLocale();

  return (
    <SuperadminSecurityLogsView
      logs={data.logs}
      stats={data.stats}
      locale={locale}
    />
  );
}
