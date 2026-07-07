import { requireSuperadmin } from "@/lib/auth";

/**
 * Gate server-side untuk SELURUH area Superadmin.
 * Sebelum layout ini, tidak ada gate server untuk `/superadmin/*` —
 * siapa pun bisa me-render halaman superadmin. `requireSuperadmin`
 * memastikan hanya identitas superadmin (auth metadata) yang lolos.
 */
export default async function SuperadminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireSuperadmin();
  return <>{children}</>;
}
