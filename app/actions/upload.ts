"use server";

import { getDatabaseService, getStorageService } from "@/lib/providers";
import { getTenantSubdomain } from "@/lib/tenant";

export async function uploadLogoAction(formData: FormData) {
  try {
    const subdomain = await getTenantSubdomain();
    if (!subdomain) return { error: "Akses ditolak" };

    const file = formData.get("logo") as File;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Ambil penyedia database dan storage yang aktif dari .env
    const dbProvider = getDatabaseService();
    const storageProvider = getStorageService();

    // 2. Hubungkan ke DB penyedia yang aktif
    const { client: db, tenantId, dbModel } = await dbProvider.getClient(subdomain);

    // 3. Unggah ke Storage penyedia yang aktif (S3 / Supabase otomatis menyesuaikan)
    const logoUrl = await storageProvider.uploadFile(
      "company-logos",
      `logo-${Date.now()}-${file.name}`,
      buffer,
      file.type,
      tenantId,
      dbModel
    );

    // 4. Simpan ke Database menggunakan ORM yang aktif
    // (Contoh jika menggunakan Prisma)
    await db.project.create({
      data: {
        name: "Proyek Baru",
        logoUrl: logoUrl,
        ...(dbModel === "SHARED" ? { tenantId } : {})
      }
    });

    return { success: true, url: logoUrl };
  } catch (err: any) {
    return { error: err.message };
  }
}
