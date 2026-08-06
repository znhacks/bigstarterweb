import { IStorageService } from "@/interfaces/storage";
import { SupabaseStorageService } from "@/services/storages/supabaseStorage";
import { SupabaseDatabaseService } from "@/services/databases/supabase";
// lib/providers.ts
import { bigstarterConfig } from "@/bigstarter.config";
import { IDatabaseService } from "@/interfaces/database";
import type { ICurrencyRateService } from "@/interfaces/currency-rate";
import { CURRENCY_PROVIDERS } from "@/services/currency/registry";
import { CachedRateService } from "@/services/currency/cachedRateService";
import { CURRENCY } from "@/config/i18n-culture";

// import { S3StorageService } from "@/services/storage/s3Storage";

export function getDatabaseService(): IDatabaseService {
  const active = bigstarterConfig.database.activeProvider;
  const allowed = bigstarterConfig.database.allowedProviders;

  // Validasi apakah provider yang diaktifkan di .env diizinkan oleh config
  if (!allowed.includes(active as any)) {
    throw new Error(`Akses Ditolak: Provider Database "${active}" dilarang dalam konfigurasi.`);
  }

  if (active === "prisma") {
    const { PrismaDatabaseService } = require("@/services/databases/prisma");
    return new PrismaDatabaseService();
  }
  return new SupabaseDatabaseService(); // default 'supabase'
}

export function getStorageService(): IStorageService {
  const active = bigstarterConfig.storage.activeProvider;
  const allowed = bigstarterConfig.storage.allowedProviders;

  // Validasi izin storage
  if (!allowed.includes(active as any)) {
    throw new Error(`Akses Ditolak: Provider Storage "${active}" dilarang dalam konfigurasi.`);
  }

  //   if (active === "s3") return new S3StorageService();
  return new SupabaseStorageService(); // default 'supabase'
}
