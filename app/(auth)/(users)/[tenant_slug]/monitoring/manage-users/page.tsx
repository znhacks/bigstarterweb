import { getManageUsersData } from "./actions";
import { ManageUsersView } from "./view";

interface PageProps {
  params: Promise<{
    tenant_slug: string;
  }>;
}

export default async function ManageUsersPage({ params }: PageProps) {
  const { tenant_slug } = await params;
  const data = await getManageUsersData(tenant_slug);

  return (
    <ManageUsersView
      tenantSlug={tenant_slug}
      schoolCode={data.schoolCode}
      tenantName={data.tenantName}
      connectedSchools={data.connectedSchools}
      users={data.users}
      stats={data.stats}
    />
  );
}
