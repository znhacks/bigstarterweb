import { requireSuperadmin } from "@/lib/auth";
import { getSuperadminSecurityLogsAction } from "./actions";
import { SuperadminSecurityLogsView } from "./view";

export default async function SuperadminSecurityLogsPage() {
  await requireSuperadmin();
  const data = await getSuperadminSecurityLogsAction();

  return (
    <SuperadminSecurityLogsView
      logs={data.logs}
      stats={data.stats}
    />
  );
}
