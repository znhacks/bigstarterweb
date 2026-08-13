import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    tenant_slug: string;
  }>;
}

export default async function SchoolUsersPage({ params }: PageProps) {
  const { tenant_slug } = await params;
  redirect(`/${tenant_slug}/monitoring/manage-users`);
}
