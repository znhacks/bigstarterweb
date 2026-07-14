import { z } from "zod";
import { tenantConfig } from "@/config/tenant"; // Sesuaikan path import

// Helper untuk daftar kode bahasa yang didukung dari file konfigurasi
const supportedLocales = tenantConfig.supported.locales.map((l) => l.code) as [string, ...string[]];
const supportedCurrencies = tenantConfig.supported.currencies.map((c) => c.code) as [
  string,
  ...string[]
];

export const updateTenantSchema = z.object({
  // Identitas dasar (selalu wajib)
  name: z.string().min(1, { message: "Name is required" }).max(255),
  logo: z.string().url().nullable().optional(),
  slug: z
    .string()
    .min(3)
    .max(255)
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug can only contain lowercase letters, numbers, and hyphens"
    })
    .optional(),

  // 1. Validasi Alamat (Hanya divalidasi jika fiturnya aktif di konfigurasi)
  address_line1: tenantConfig.features.enableAddress
    ? z.string().max(255).nullable().optional()
    : z.any().optional(),
  address_line2: tenantConfig.features.enableAddress
    ? z.string().max(255).nullable().optional()
    : z.any().optional(),
  city: tenantConfig.features.enableAddress
    ? z.string().max(100).nullable().optional()
    : z.any().optional(),
  state_province: tenantConfig.features.enableAddress
    ? z.string().max(100).nullable().optional()
    : z.any().optional(),
  postal_code: tenantConfig.features.enableAddress
    ? z.string().max(20).nullable().optional()
    : z.any().optional(),
  country_code: tenantConfig.features.enableAddress
    ? z
        .string()
        .length(2, { message: "Must be a valid 2-character country code" })
        .nullable()
        .optional()
    : z.any().optional(),

  // 2. Validasi Kontak Bisnis & Pajak
  business_email: tenantConfig.features.enableBusinessContact
    ? z.string().email({ message: "Invalid email address" }).nullable().optional().or(z.literal(""))
    : z.any().optional(),
  phone_number: tenantConfig.features.enableBusinessContact
    ? z.string().max(50).nullable().optional()
    : z.any().optional(),
  tax_id: tenantConfig.features.enableTaxId
    ? z.string().max(100).nullable().optional()
    : z.any().optional(),

  // 3. Validasi Internasionalisasi (i18n)
  default_locale: tenantConfig.features.enableRegionalSettings
    ? z
        .string()
        .refine((val) => tenantConfig.supported.locales.some((l) => l.code === val), {
          message: "Unsupported language locale"
        })
    : z.string().optional(),

  currency: tenantConfig.features.enableRegionalSettings
    ? z
        .string()
        .refine((val) => tenantConfig.supported.currencies.some((c) => c.code === val), {
          message: "Unsupported currency"
        })
    : z.string().optional(),
  timezone: tenantConfig.features.enableRegionalSettings
    ? z.string().min(1, { message: "Timezone is required" }) // Validasi nama zona waktu IANA dasar
    : z.string().optional()
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
