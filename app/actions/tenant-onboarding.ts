// app/actions/tenant-onboarding.ts
"use server";

import { bigstarterConfig } from "@/bigstarter.config";
import { createClient } from "@supabase/supabase-js";

// PERBAIKAN: Tentukan skema 'system' langsung pada opsi inisialisasi db
const systemSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: { schema: "system" }, // <-- Mengunci client ini hanya untuk skema 'system'
    auth: { persistSession: false }
  }
);

export async function registerNewTenant(
  name: string,
  subdomain: string,
  requestedPlan: "FREE" | "ENTERPRISE"
) {
  try {
    const config = bigstarterConfig.database.multiTenancy;
    let finalModel: "SHARED" | "ISOLATED" = requestedPlan === "ENTERPRISE" ? "ISOLATED" : "SHARED";

    // Validasi Force Globally
    if (config.forceModelGlobally) {
      finalModel = config.forceModelGlobally;
    } else {
      // Validasi izin model
      if (finalModel === "SHARED" && !config.allowModel1Shared) {
        throw new Error("Pendaftaran gagal: Registrasi Model 1 (Shared) sedang dinonaktifkan.");
      }
      if (finalModel === "ISOLATED" && !config.allowModel2Isolated) {
        throw new Error("Pendaftaran gagal: Registrasi Model 2 (Isolated) sedang dinonaktifkan.");
      }
    }

    // PERBAIKAN: Hapus .withSchema("system") karena client sudah dikonfigurasi ke skema 'system'
    const { data: tenant, error } = await systemSupabase
      .from("tenants") // <-- Langsung panggil tabel tenants
      .insert({ name, subdomain, db_model: finalModel })
      .select()
      .single();

    if (error) throw error;

    // Jika Model 2, jalankan fungsi pembuatan skema otomatis di PostgreSQL
    if (finalModel === "ISOLATED") {
      const { error: rpcError } = await systemSupabase.rpc("create_new_tenant_schema", {
        tenant_subdomain: subdomain
      });
      if (rpcError) throw rpcError;
    }

    return { success: true, tenant };
  } catch (error: any) {
    return { error: error.message };
  }
}
