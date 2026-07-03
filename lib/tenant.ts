// lib/tenant.ts
import { headers } from "next/headers";

// Tambahkan 'async' di depan deklarasi fungsi
export async function getTenantSubdomain(): Promise<string | null> {
  const headersList = await headers(); // <-- Tambahkan 'await' di sini
  const host = headersList.get("host");

  if (!host) return null;

  const domainParts = host.split(".");
  if (domainParts.length > 1) {
    return domainParts[0];
  }

  return null;
}
