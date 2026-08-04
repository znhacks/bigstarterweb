import { getActivityLogsData } from "./actions";
import { ActivityLogsView } from "./view";

interface PageProps {
  params: Promise<{
    tenant_slug: string;
  }>;
}

export default async function ActivityLogsPage({ params }: PageProps) {
  const { tenant_slug } = await params;
  const data = await getActivityLogsData(tenant_slug);

  return (
    <ActivityLogsView
      schoolCode={data.schoolCode}
      tenantName={data.tenantName}
      logs={data.logs}
      stats={data.stats}
    />
  );
}
