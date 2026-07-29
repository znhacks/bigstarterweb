// config/feature-definitions.ts

export interface FeatureOption {
  label: string;
  value: string;
}

export interface FeatureDefinition {
  key: string;
  label: string;
  type: "boolean" | "number" | "select" | "string"; // Diperluas
  defaultValue: any;
  description: string;
  options?: FeatureOption[]; // Opsional untuk tipe "select"
}

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
  },

  // CONTOH TIPE BARU 1: SELECT (ENUM)
  {
    key: "supportTier",
    label: "Support Service Tier",
    type: "select",
    defaultValue: "email",
    description: "Tingkat prioritas layanan bantuan bantuan pelanggan (Support Ticket).",
    options: [
      { value: "email", label: "Email Support" },
      { value: "chat", label: "24/7 Live Chat" },
      { value: "dedicated", label: "Dedicated Call Manager" }
    ]
  },

  // CONTOH TIPE BARU 2: STRING (TEXT)
  {
    key: "customBrandingText",
    label: "Custom Branding Text",
    type: "string",
    defaultValue: "Powered by SaaS",
    description:
      "Teks kustomisasi hak cipta/atribusi yang akan ditampilkan pada bagian footer aplikasi."
  }
];

export type FeatureGateKeys = (typeof FEATURE_DEFINITIONS)[number]["key"];

export interface FeatureGates {
  maxUsers: number;
  maxTasks: number;
  allowPdfFormat: boolean;
  chooseIpLocation: boolean;
  removeAttribution: boolean;
  prioritySupport: boolean;
  supportTier: "email" | "chat" | "dedicated"; // Ditambahkan
  customBrandingText: string; // Ditambahkan
}

export function decodeFeatureGates(features: string[] | null | undefined): FeatureGates {
  const arr = Array.isArray(features) ? features : [];
  const gates = {} as Record<string, any>;

  for (const def of FEATURE_DEFINITIONS) {
    if (def.type === "number") {
      gates[def.key] = getFeatureLimitInArray(arr, def.key, def.defaultValue);
    } else if (def.type === "select") {
      gates[def.key] = getFeatureStringInArray(arr, def.key, def.defaultValue, "select");
    } else if (def.type === "string") {
      gates[def.key] = getFeatureStringInArray(arr, def.key, def.defaultValue, "string");
    } else {
      gates[def.key] = hasFeatureInArray(arr, def.key) || def.defaultValue === true;
    }
  }

  return gates as unknown as FeatureGates;
}

export function hasFeatureInArray(features: string[], key: string): boolean {
  if (!Array.isArray(features)) return false;
  return features.includes(key);
}

export function getFeatureLimitInArray(
  features: string[],
  key: string,
  defaultValue: number
): number {
  if (!Array.isArray(features)) return defaultValue;

  const prefix = `limit:${key}:`;
  const match = features.find((item) => item.startsWith(prefix));

  if (!match) return defaultValue;

  const parts = match.split(":");
  const value = parseInt(parts[2]);

  return isNaN(value) ? defaultValue : value;
}

// Helper baru untuk mengekstrak string dengan aman (aman dari bug karakter pemisah titik dua ':')
export function getFeatureStringInArray(
  features: string[],
  key: string,
  defaultValue: string,
  type: "select" | "string"
): string {
  if (!Array.isArray(features)) return defaultValue;

  const prefix = `${type}:${key}:`;
  const match = features.find((item) => item.startsWith(prefix));

  if (!match) return defaultValue;

  // Mengambil teks asli di belakang prefiks secara utuh
  return match.substring(prefix.length);
}
