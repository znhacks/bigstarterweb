import { createClient } from "@supabase/supabase-js";
import { IStorageService } from "@/interfaces/storage";

export class SupabaseStorageService implements IStorageService {
  private client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async uploadFile(
    bucket: string,
    path: string,
    fileBuffer: Buffer,
    contentType: string,
    tenantId?: string,
    dbModel?: "SHARED" | "ISOLATED"
  ): Promise<string> {
    const finalPath = dbModel === "SHARED" && tenantId ? `${tenantId}/${path}` : path;

    try {
      // Pastikan bucket ada dan bersifat publik
      const { data: buckets } = await this.client.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === bucket);
      if (!bucketExists) {
        await this.client.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 5242880 // 5MB limit
        });
      }
    } catch (e) {
      // Abaikan error pembuatan jika bucket sudah ada
    }

    const { error } = await this.client.storage
      .from(bucket)
      .upload(finalPath, fileBuffer, { contentType, upsert: true });

    if (error) throw error;

    const { data } = this.client.storage.from(bucket).getPublicUrl(finalPath);
    return data.publicUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    await this.client.storage.from(bucket).remove([path]);
  }
}
