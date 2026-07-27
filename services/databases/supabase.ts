import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { IDatabaseService } from "@/interfaces/database";
import { tenantRepository } from "@/supabase/repositories/tenants";

const systemSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const systemServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const systemSupabase = createClient(systemSupabaseUrl, systemServiceKey, {
  auth: { persistSession: false }
});

const connectionCache: Record<string, SupabaseClient> = {};

export class SupabaseDatabaseService implements IDatabaseService<SupabaseClient> {
  async getClient(subdomain: string) {
    const { data: tenant, error } = await (
      await tenantRepository(systemSupabase)
    )
      .query()
      .select("*")
      .eq("subdomain", subdomain)
      .single();

    if (error || !tenant) {
      throw new Error("Tenant tidak ditemukan atau tidak aktif");
    }

    if (tenant.db_model === "SHARED") {
      return {
        client: systemSupabase,
        tenantId: tenant.id,
        dbModel: "SHARED" as const
      };
    }

    if (tenant.db_model === "ISOLATED") {
      if (!tenant.supabase_url || !tenant.supabase_anon_key) {
        throw new Error("Kredensial database Supabase terisolasi tidak lengkap");
      }

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
