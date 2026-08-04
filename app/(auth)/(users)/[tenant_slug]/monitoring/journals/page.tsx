import { getJournalLogsData } from "./actions";
import { JournalLogsView } from "./view";

interface PageProps {
  params: Promise<{
    tenant_slug: string;
  }>;
}

export default async function JournalLogsPage({ params }: PageProps) {
  const { tenant_slug } = await params;
  const data = await getJournalLogsData(tenant_slug);

  return (
    <JournalLogsView
      schoolCode={data.schoolCode}
      tenantName={data.tenantName}
      journals={data.journals}
      stats={data.stats}
    />
  );
}
