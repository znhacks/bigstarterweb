// lib/supabase/tenant-server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getTenantClient } from "@/lib/supabase/manager";

/**
 * Membuat Supabase SERVER client yang ter-scope ke schema data tenant
 * (tenant_shared untuk SHARED, tenant_<subdomain> untuk ISOLATED) dan
 * membawa sesi user (cookie) — sehingga RLS pada schema tersebut berlaku
 * (auth.uid() ter-resolve). Berbeda dari getTenantClient yang memakai
 * service role (bypass RLS).
 *
 * `tenantSlug` == subdomain (lihat app/actions/tenant.ts: slug digunakan
 * sebagai subdomain), sehingga cocok untuk resolver getTenantClient.
 *
 * Mengembalikan juga `schemaTarget` bila pemanggil perlu tahu schema aktif.
 */
export async function createTenantServerClient(tenantSlug: string) {
  // Resolve schema + tenantId lewat service role (cukup untuk baca baris tenant).
  const { schemaTarget, tenantId } = await getTenantClient(tenantSlug);

  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createServerClient(url, anonKey, {
    db: { schema: schemaTarget },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Diabaikan jika dipanggil dari Server Component.
        }
      }
    },
    auth: {
      experimental: {
        passkey: true
      }
    }
  });

  return { client, tenantId, schemaTarget };
}
