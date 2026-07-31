import { requireSuperadmin } from "@/lib/auth";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperadmin();
  return <div className="px-3 py-3">{children}</div>;
}
