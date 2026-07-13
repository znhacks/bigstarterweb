// config/billing.ts

export interface GatewayIds {
  stripe?: string;
  paypal?: string;
  lemonsqueezy?: string;
  paddle?: string;
  braintree?: string;
  midtrans?: string;
  xendit?: string;
  mayar?: string;
}

/**
 * 1. DEFINISI FEATURE GATES (Sangat penting untuk Developer)
 * Di sini developer bisa melihat dan menambah kunci fitur yang ingin dibatasi.
 * Penamaan di sini harus berupa key yang akan dicek secara programmatic di dalam kode.
 */
export interface FeatureGates {
  maxUsers: number; // Batas maksimal pengguna dalam satu tenant
  maxTasks: number; // Batas kuota screenshot per bulan
  allowPdfFormat: boolean; // Apakah diizinkan mengunduh format PDF
  chooseIpLocation: boolean; // Apakah diizinkan memilih lokasi IP geolocator
  removeAttribution: boolean; // Apakah tautan atribusi dihapus (White-label)
  prioritySupport: boolean; // Apakah mendapatkan jalur dukungan prioritas
}

export interface PlanPriceDetail {
  amount: number;
  providers?: GatewayIds;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  displayFeatures: string[]; // Fitur berupa teks biasa untuk tampilan tabel harga (UI)
  featureGates: FeatureGates; // Fitur terstruktur untuk dibaca oleh kode logika (Sistem)
  prices: {
    monthly: PlanPriceDetail;
    yearly: PlanPriceDetail;
  };
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "For testing and hobby use.",
    displayFeatures: [
      "200 Tasks per month",
      "20 requests per minute",
      "PNG, JPEG, WebP format",
      "Attribution link required"
    ],
    featureGates: {
      maxUsers: 5,
      maxTasks: 20,
      allowPdfFormat: false,
      chooseIpLocation: false,
      removeAttribution: false,
      prioritySupport: false
    },
    prices: {
      monthly: { amount: 0 },
      yearly: { amount: 0 }
    }
  },
  {
    id: "starter",
    name: "Starter",
    description: "For projects moving into production.",
    displayFeatures: [
      "2,000 Tasks per month",
      "40 requests per minute",
      "PNG, JPEG, WebP, PDF format",
      "No attribution link required",
      "Choose IP location"
    ],
    featureGates: {
      maxUsers: 10,
      maxTasks: 2000,
      allowPdfFormat: true,
      chooseIpLocation: true,
      removeAttribution: true, // No attribution
      prioritySupport: false
    },
    prices: {
      monthly: {
        amount: 49000,
        providers: {
          paddle: "pri_01kx5gffxd7njjqjernsaf1pv2",
          stripe: "price_starter_monthly",
          paypal: "P-8RT67572UE321251WNJKEUSY",
          midtrans: "starter-monthly"
        }
      },
      yearly: {
        amount: 499000,
        providers: {
          paddle: "pri_01kx5expy305m7kbtwpkt0jcvk",
          stripe: "price_starter_yearly",
          paypal: "P-3C2171138L1229134NJKEVRI",
          midtrans: "starter-yearly"
        }
      }
    }
  },
  {
    id: "pro",
    name: "Pro",
    description: "For production workloads at higher volume.",
    displayFeatures: [
      "10,000 Tasks per month",
      "80 requests per minute",
      "PNG, JPEG, WebP, PDF format",
      "No attribution link required",
      "Choose IP location",
      "Priority Support"
    ],
    featureGates: {
      maxUsers: 20,
      maxTasks: 10000,
      allowPdfFormat: true,
      chooseIpLocation: true,
      removeAttribution: true,
      prioritySupport: true
    },
    prices: {
      monthly: {
        amount: 99000,
        providers: {
          paddle: "pri_01kx5gc9ga1h4bygs7y73mx4fj",
          stripe: "price_pro_monthly",
          paypal: "P-0HS37391YR5408237NJKEU4A",
          midtrans: "pro-monthly"
        }
      },
      yearly: {
        amount: 999000,
        providers: {
          paddle: "pri_01kx5f03c7e6ckdtgv8z5wj37j",
          stripe: "price_pro_yearly",
          paypal: "P-9EW74982SN4545717NJKEV7A",
          midtrans: "pro-yearly"
        }
      }
    }
  }
];
