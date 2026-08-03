// lib/supabase/tenant-server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { systemClient } from "@/lib/supabase/manager";
import { tenantRepository } from "@/supabase/repositories/tenants";

/**
 * Membuat Supabase SERVER client yang ter-scope ke schema data tenant
 * (tenant_shared untuk SHARED, tenant_<subdomain> untuk ISOLATED) dan
 * membawa sesi user (cookie) — sehingga RLS pada schema tersebut berlaku
 * (auth.uid() ter-resolve).
 *
 * Mengambil `tenantId` (UUID) — BUKAN slug/subdomain. Men-resolve schema
 * lewat query tenants by id. Ini menghindari ketidaksesuaian slug vs
 * subdomain (getActiveTenant match by slug; kolom subdomain bisa berbeda).
 */
export async function createTenantServerClient(tenantId: string) {
  // 1. Resolve baris tenant by id. Pakai select("*") agar tidak error bila
  //    kolom opsional (subdomain/db_model) belum ada di skema tenant Anda.
  //    systemClient = service role, jadi RLS tidak berlaku di sini.
  const tenantRepo = await tenantRepository(systemClient);
  const { data: tenant, error } = await tenantRepo
    .query()
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();

  if (error || !tenant) {
    throw new Error(
      `Tenant tidak ditemukan (id=${tenantId})${error ? `: ${error.message}` : ""}`
    );
  }

  // 2. Tentukan schema target. Default SHARED -> tenant_shared.
  //    Untuk ISOLATED butuh subdomain; bila tidak ada, fallback tenant_shared.
  const schemaTarget =
    tenant.db_model === "ISOLATED" && tenant.subdomain
      ? `tenant_${tenant.subdomain}`
      : "public";

  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const clientOptions: any = {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: any[]) {
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
  };

  if (schemaTarget !== "public") {
    clientOptions.db = { schema: schemaTarget };
  }

  const client = createServerClient(url, anonKey, clientOptions);

  return { client, tenantId, schemaTarget };
}
