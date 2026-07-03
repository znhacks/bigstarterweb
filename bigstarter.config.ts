// boilerplate.config.ts

export const bigstarterConfig = {
  // 1. KONTROL DATABASE
  database: {
    // Batasi provider apa saja yang diizinkan aktif
    allowedProviders: ["supabase" /*"prisma"*/] as const,
    activeProvider: (process.env.DATABASE_PROVIDER || "supabase") as "supabase" | "prisma",

    // Batasi Model Multi-Tenancy
    multiTenancy: {
      allowModel1Shared: true, // Jika false, Model 1 (Shared) tidak bisa digunakan
      allowModel2Isolated: false, // Jika false, Model 2 (Isolated) tidak bisa digunakan

      // Paksa sistem untuk hanya menggunakan satu model secara global (mengabaikan input user)
      // Opsi: null (dinamis), 'SHARED' (paksa Model 1), atau 'ISOLATED' (paksa Model 2)
      forceModelGlobally: null as null | "SHARED" | "ISOLATED"
    }
  },

  // 2. KONTROL STORAGE
  storage: {
    // Batasi provider storage yang diizinkan aktif
    allowedProviders: ["supabase" /*"s3"*/] as const,
    activeProvider: (process.env.STORAGE_PROVIDER || "supabase") as "supabase" | "s3"
  }
};
