import { generateMeta } from "@/lib/utils";
import { ApiKeysDataTable } from "./components/datatable";

export async function generateMetadata() {
  return generateMeta({
    title: "API Keys",
    additionalTitle: true,
    description:
      "Create and revoke API keys to access the public REST API. Keys are scoped to the active organization.",
    canonical: "/apps/api-keys"
  });
}

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        <p className="text-muted-foreground text-sm">
          Manage API keys for the active organization. Use them as{" "}
          <code className="font-mono">Authorization: Bearer sk_live_…</code> against{" "}
          <code className="font-mono">/api/v1/*</code>. See the interactive docs at{" "}
          <a href="/api-docs" className="text-foreground underline">
            /api-docs
          </a>
          .
        </p>
      </div>
      <ApiKeysDataTable />
    </div>
  );
}
