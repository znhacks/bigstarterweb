// config/feature-definitions.ts

export interface FeatureDefinition {
  key: string; // Key unik yang akan dicek di kode (misal: 'allowPdfFormat')
  label: string; // Label bahasa manusia yang tampil di Form Superadmin
  type: "boolean" | "number"; // Tipe data (mempengaruhi render input: Switch atau Number Input)
  defaultValue: any; // Nilai bawaan jika tidak diatur
  description: string; // Penjelasan fungsi fitur untuk memudahkan developer/admin
}

/**
 * DAFTAR FITUR RBAC UTAMA (Single Source of Truth)
 * Developer cukup menambah baris di sini untuk mendaftarkan fitur RBAC baru.
 * Konsol Superadmin & Logic Gating akan langsung menyesuaikan diri secara otomatis!
 */
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: "maxUsers",
    label: "Max Team Members",
    type: "number",
    defaultValue: 5,
    description: "Batas maksimal anggota tim yang dapat diundang ke dalam satu organisasi/tenant."
  },
  {
    key: "maxTasks",
    label: "Max Tasks Limit",
    type: "number",
    defaultValue: 20,
    description: "Kuota pembuatan tugas (tasks) bulanan yang diizinkan untuk tenant."
  },
  {
    key: "allowPdfFormat",
    label: "Allow PDF Export",
    type: "boolean",
    defaultValue: false,
    description:
      "Mengizinkan pengguna mengunduh atau mengekspor laporan tugas ke dalam format dokumen PDF."
  },
  {
    key: "chooseIpLocation",
    label: "Allow Geolocator IP",
    type: "boolean",
    defaultValue: false,
    description: "Mengizinkan pengguna untuk memilih atau mengaktifkan IP geolokasi pada sistem."
  },
  {
    key: "removeAttribution",
    label: "Remove System Attribution",
    type: "boolean",
    defaultValue: false,
    description: "Menghilangkan teks atribusi sistem/hak cipta pada aplikasi (fitur White-label)."
  },
  {
    key: "prioritySupport",
    label: "Priority Support Access",
    type: "boolean",
    defaultValue: false,
    description: "Memberikan akses prioritas ke jalur dukungan pelanggan / helpdesk bagi pengguna."
  }
];

export type FeatureGateKeys = (typeof FEATURE_DEFINITIONS)[number]["key"];

/**
 * =========================================================================
 * UTILLITAS HELPER PENERJEMAH ARRAY TEKS (DATABASE-TO-LOGIC)
 * =========================================================================
 */

/**
 * Mengecek apakah sebuah fitur boolean aktif di dalam array database
 * Contoh array database: ['allowPdfFormat', 'chooseIpLocation']
 * hasFeature(databaseArray, 'allowPdfFormat') -> true
 */
export function hasFeatureInArray(features: string[], key: string): boolean {
  if (!Array.isArray(features)) return false;
  return features.includes(key);
}

/**
 * Mengecek batas numerik di dalam array database
 * Contoh array database: ['limit:maxTasks:2000', 'allowPdfFormat']
 * getFeatureLimitInArray(databaseArray, 'maxTasks', 20) -> 2000
 */
export function getFeatureLimitInArray(
  features: string[],
  key: string,
  defaultValue: number
): number {
  if (!Array.isArray(features)) return defaultValue;

  const prefix = `limit:${key}:`;
  const match = features.find((item) => item.startsWith(prefix));

  if (!match) return defaultValue;

  // Melakukan split string 'limit:maxTasks:2000' -> ['limit', 'maxTasks', '2000']
  const parts = match.split(":");
  const value = parseInt(parts[2]);

  return isNaN(value) ? defaultValue : value;
}
