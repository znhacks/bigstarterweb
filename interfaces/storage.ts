export interface IStorageService {
  uploadFile(
    bucket: string,
    path: string,
    fileBuffer: Buffer,
    contentType: string,
    tenantId?: string,
    dbModel?: "SHARED" | "ISOLATED"
  ): Promise<string>;
  deleteFile(bucket: string, path: string): Promise<void>;
}
