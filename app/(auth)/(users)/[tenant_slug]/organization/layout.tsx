import { getTranslations } from "next-intl/server";
import { getActiveTenant } from "@/services/tenant";
import { getAccessibleOrgRoutes } from "@/modules/rbac/shared/org-access";
import { OrganizationNav } from "./components/organization-nav";

export default async function SettingsLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = await params;
  const t = await getTranslations("organization");

  // Resolve role pengguna di organisasi ini (server) lalu hitung menu yang
  // boleh ditampilkan. Tidak ada flash karena filter terjadi sebelum render.
  // Bila pengguna bukan member (ctx null) → tidak ada menu; akses halaman akan
  // di-block 404 oleh gate `requireOrgRoute` di tiap page.tsx.
  const ctx = await getActiveTenant(tenant_slug);
  const visibleRoutes = getAccessibleOrgRoutes(ctx?.permissions ?? null);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="md:col-span-1">
          <OrganizationNav tenantSlug={tenant_slug} routes={visibleRoutes} />
        </div>

        <div className="md:col-span-3">{children}</div>
      </div>
    </div>
  );
}
