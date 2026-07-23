// lib/supabase/manager.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { tenantRepository } from "@/supabase/repositories/tenants";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// PERBAIKAN: Gunakan <any, any> agar client sistem ini bisa menerima skema 'system'
export const systemClient: SupabaseClient<any, any> = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    db: { schema: "public" },
    auth: { persistSession: false }
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
    tenant.db_model === "SHARED" ? "tenant_shared" : `tenant_${tenant.subdomain}`;

  // 2. Ambil dari cache atau buat baru jika belum ada
  if (!connectionCache[targetSchema]) {
    connectionCache[targetSchema] = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: targetSchema },
      auth: { persistSession: false }
    });
  }

  return {
    client: connectionCache[targetSchema],
    tenantId: tenant.id,
    schemaTarget: targetSchema,
    dbModel: tenant.db_model
  };
}
