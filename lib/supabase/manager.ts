// lib/supabase/manager.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { tenantRepository } from "@/supabase/repositories/tenants";

/**
 * Membaca & memvalidasi env var service-role. Dipanggil LAZY (saat client
 * pertama kali benar-benar dipakai), BUKAN saat module dievaluasi — agar
 * modul ini aman di-import selama fase build Next.js (collect page config)
 * di Vercel, saat env var belum tentu tersedia. Mencegah throw
 * `supabaseUrl is required` yang menggagalkan build.
 */
function resolveServiceEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service-role env vars are not set. Define NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return { url, serviceKey };
}

// PERBAIKAN: Gunakan <any, any> agar client sistem ini bisa menerima skema 'system'
let _systemClient: SupabaseClient<any, any> | null = null;

/**
 * Service-role client untuk skema 'public' (system). LAZY via Proxy: client
 * baru dibuat saat propertinya pertama kali diakses (mirip pola
 * @/lib/api/supabase-server). Mencegah throw saat module dievaluasi.
 */
export const systemClient: SupabaseClient<any, any> = new Proxy(
  {} as SupabaseClient<any, any>,
  {
    get(_target, prop) {
      _systemClient ??= (() => {
        const { url, serviceKey } = resolveServiceEnv();
        return createClient(url, serviceKey, {
          db: { schema: "public" },
          auth: { persistSession: false }
        });
      })();
      return Reflect.get(_systemClient as object, prop);
    }
  }
);

// PERBAIKAN: Ubah Record<string, SupabaseClient> menjadi Record<string, SupabaseClient<any, any>>
const connectionCache: Record<string, SupabaseClient<any, any>> = {};

// PERBAIKAN: Ubah tipe kembalian 'client' menjadi SupabaseClient<any, any>
export async function getTenantClient(subdomain: string): Promise<{
  client: SupabaseClient<any, any>; // <-- Diubah di sini
  tenantId: string;
  schemaTarget: string;
  dbModel: "SHARED" | "ISOLATED";
}> {
  // 1. Cari info tenant di skema 'system'
  const tenantRepo = await tenantRepository(systemClient);
  const { data: tenant, error } = await tenantRepo
    .query()
    .select("*")
    .eq("subdomain", subdomain)
    .single();

  if (error || !tenant) {
    throw new Error("Tenant tidak terdaftar");
  }

  // Tentukan nama skema tujuan berdasarkan model tenant
  const targetSchema =
    tenant.db_model === "SHARED" ? "public" : `tenant_${tenant.subdomain}`;

  // 2. Ambil dari cache atau buat baru jika belum ada
  if (!connectionCache[targetSchema]) {
    const { url, serviceKey } = resolveServiceEnv();
    const opts: any = { auth: { persistSession: false } };
    if (targetSchema !== "public") {
      opts.db = { schema: targetSchema };
    }
    connectionCache[targetSchema] = createClient(url, serviceKey, opts);
  }

  return {
    client: connectionCache[targetSchema],
    tenantId: tenant.id,
    schemaTarget: targetSchema,
    dbModel: tenant.db_model
  };
}
