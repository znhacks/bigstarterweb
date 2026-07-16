import { z } from "zod";
import { LOCALES } from "@/config/i18n-culture";

const supportedLocales = [...LOCALES] as [string, ...string[]];

/**
 * Schema validasi update profile (user general settings).
 * Seluruh field opsional (partial) karena handler save bisa parsial (nama saja, address saja, dll).
 */
export const updateProfileSchema = z.object({
  full_name: z.string().max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  phone: z
    .string()
    .max(50)
    .nullable()
    .optional()
    .or(z.literal("")),
  preferred_language: z
    .string()
    .refine((val) => supportedLocales.includes(val), { message: "Unsupported language locale" })
    .optional(),
  timezone: z.string().max(100).optional(),
  address_line1: z.string().max(255).nullable().optional(),
  address_line2: z.string().max(255).nullable().optional(),
  address_city: z.string().max(100).nullable().optional(),
  address_region: z.string().max(100).nullable().optional(),
  address_postal_code: z.string().max(20).nullable().optional(),
  address_country: z
    .string()
    .length(2, { message: "Must be a valid 2-character country code" })
    .nullable()
    .optional(),
  address_kecamatan: z.string().max(100).nullable().optional(),
  address_desa: z.string().max(100).nullable().optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
