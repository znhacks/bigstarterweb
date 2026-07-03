"use server";

import { getDatabaseService, getStorageService } from "@/lib/providers";
import { getTenantSubdomain } from "@/lib/tenant";

export async function createProjectAction(formData: FormData) {
  try {
    const subdomain = await getTenantSubdomain();
    if (!subdomain) return { error: "Akses ditolak" };

    const projectName = formData.get("name") as string;
    const file = formData.get("logo") as File;

    const dbProvider = getDatabaseService();
    const storageProvider = getStorageService();

    // 1. Ambil client database yang aktif (SupabaseClient)
    const { client: supabase, tenantId, dbModel } = await dbProvider.getClient(subdomain);

    let logoUrl = "";

    // 2. Unggah file menggunakan storage provider yang aktif
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      logoUrl = await storageProvider.uploadFile(
        "project-assets",
        `logos/${Date.now()}-${file.name}`,
        buffer,
        file.type,
        tenantId,
        dbModel
      );
    }

    // 3. Simpan data menggunakan sintaksis Supabase Client
    const insertData: any = {
      name: projectName,
      logo_url: logoUrl
    };

    if (dbModel === "SHARED") {
      insertData.tenant_id = tenantId; // Wajib diisi jika Model 1 (Shared)
    }

    const { data, error } = await supabase.from("projects").insert(insertData).select();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || "Terjadi kesalahan" };
  }
}
