import { getUserTenants } from "@/services/tenant";
import { redirect } from "next/navigation";

export default async function MonitoringFallbackPage({
  params
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const tenants = await getUserTenants();

  if (tenants.length === 0) {
    redirect("/create-tenant");
  }

  const tenantSlug = tenants[0].tenant.slug;
  const subPath = path && path.length > 0 ? path.join("/") : "journals";

  redirect(`/${tenantSlug}/monitoring/${subPath}`);
}
