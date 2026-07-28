"use server";

import { getDatabaseService, getStorageService } from "@/lib/providers";
import { getTenantSubdomain } from "@/lib/tenant";
import { projectRepository } from "@/supabase/repositories/projects";

export async function createProjectAction(formData: FormData) {
  try {
    const subdomain = await getTenantSubdomain();
    if (!subdomain) return { error: "Akses ditolak" };

    const projectName = formData.get("name") as string;
    const file = formData.get("logo") as File;

    const dbProvider = getDatabaseService();
    const storageProvider = getStorageService();

    const { client: supabase, tenantId, dbModel } = await dbProvider.getClient(subdomain);

    let logoUrl = "";

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

    const insertData: any = {
      name: projectName,
      logo_url: logoUrl
    };

    if (dbModel === "SHARED") {
      insertData.tenant_id = tenantId;
    }

    const { data, error } = await (
      await projectRepository(supabase)
    )
      .query()
      .insert(insertData)
      .select();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || "Terjadi kesalahan" };
  }
}
