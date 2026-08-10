import { createClient } from "@supabase/supabase-js";
import { IStorageService } from "@/interfaces/storage";
import { supabaseAdmin } from "@/lib/api/supabase-server";

export class SupabaseStorageService implements IStorageService {
  private getClient() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey && !serviceKey.includes("YOUR_")) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://egcxjuudphnbjwqhhbra.supabase.co";
      return createClient(url, serviceKey);
    }
    return supabaseAdmin;
  }

  async uploadFile(
    bucket: string,
    path: string,
    fileBuffer: Buffer,
    contentType: string,
    tenantId?: string,
    dbModel?: "SHARED" | "ISOLATED"
  ): Promise<string> {
    const finalPath = dbModel === "SHARED" && tenantId ? `${tenantId}/${path}` : path;
    const client = this.getClient();

    try {
      // Pastikan bucket ada dan bersifat publik
      const { data: buckets } = await client.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === bucket);
      if (!bucketExists) {
        await client.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 5242880 // 5MB limit
        });
      }
    } catch (e) {
      // Abaikan error pembuatan jika bucket sudah ada
    }

    const { error } = await client.storage
      .from(bucket)
      .upload(finalPath, fileBuffer, { contentType, upsert: true });

    if (error) throw error;

    const { data } = client.storage.from(bucket).getPublicUrl(finalPath);
    return data.publicUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    await this.getClient().storage.from(bucket).remove([path]);
  }
}
