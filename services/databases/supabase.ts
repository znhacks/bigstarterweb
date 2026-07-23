import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { IDatabaseService } from "@/interfaces/database";
import { tenantRepository } from "@/supabase/repositories/tenants";

// Inisialisasi koneksi ke Project Utama (System DB)
const systemSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const systemServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const systemSupabase = createClient(systemSupabaseUrl, systemServiceKey, {
  auth: { persistSession: false }
});

// Cache koneksi untuk Model 2 (Isolated)
const connectionCache: Record<string, SupabaseClient> = {};

export class SupabaseDatabaseService implements IDatabaseService<SupabaseClient> {
  async getClient(subdomain: string) {
    // 1. Ambil data tenant dari tabel 'tenants' di Project Utama Supabase
    const { data: tenant, error } = await (await tenantRepository(systemSupabase))
      .query()
      .select("*")
      .eq("subdomain", subdomain)
      .single();

    if (error || !tenant) {
      throw new Error("Tenant tidak ditemukan atau tidak aktif");
    }

    // MODEL 1: SHARED (Menggunakan Project Utama)
    if (tenant.db_model === "SHARED") {
      return {
        client: systemSupabase,
        tenantId: tenant.id,
        dbModel: "SHARED" as const
      };
    }

    // MODEL 2: ISOLATED (Menggunakan Project Supabase Berbeda milik Tenant)
    if (tenant.db_model === "ISOLATED") {
      if (!tenant.supabase_url || !tenant.supabase_anon_key) {
        throw new Error("Kredensial database Supabase terisolasi tidak lengkap");
      }

      // Gunakan cache koneksi agar lebih efisien
      if (!connectionCache[tenant.id]) {
        connectionCache[tenant.id] = createClient(tenant.supabase_url, tenant.supabase_anon_key, {
          auth: { persistSession: false }
        });
      }

      return {
        client: connectionCache[tenant.id],
        tenantId: tenant.id,
        dbModel: "ISOLATED" as const
      };
    }

    throw new Error("Model database tidak didukung");
  }
}
