import { requireSuperadmin } from "@/lib/auth";

export default async function SuperadminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireSuperadmin();
  return <>{children}</>;
}
