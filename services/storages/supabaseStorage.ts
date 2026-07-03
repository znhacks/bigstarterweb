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
    // Model 1: Satukan dalam folder berisi tenantId
    const finalPath = dbModel === "SHARED" && tenantId ? `${tenantId}/${path}` : path;

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
