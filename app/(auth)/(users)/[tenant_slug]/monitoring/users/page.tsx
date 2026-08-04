import { getSchoolUsersData } from "./actions";
import { SchoolUsersView } from "./view";

interface PageProps {
  params: Promise<{
    tenant_slug: string;
  }>;
}

export default async function SchoolUsersPage({ params }: PageProps) {
  const { tenant_slug } = await params;
  const data = await getSchoolUsersData(tenant_slug);

  return (
    <SchoolUsersView
      schoolCode={data.schoolCode}
      tenantName={data.tenantName}
      users={data.users}
      stats={data.stats}
    />
  );
}
