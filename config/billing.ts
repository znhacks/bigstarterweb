// config/billing.ts

export interface Plan {
  id: string;
  name: string;
  description: string;
  features: string[];
  maxUsers: number;
  maxScreenshots: number;
  prices: {
    monthly: {
      amount: number;
      paypalPlanId?: string; // ID Plan dari PayPal Dashboard
      stripePriceId?: string; // ID Price dari Stripe Dashboard
    };
    yearly: {
      amount: number;
      paypalPlanId?: string;
      stripePriceId?: string;
    };
  };
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "For testing and hobby use.",
    features: [
      "200 screenshots per month",
      "20 requests per minute",
      "PNG, JPEG, WebP format",
      "Attribution link required"
    ],
    maxUsers: 2,
    maxScreenshots: 200,
    prices: {
      monthly: { amount: 0 },
      yearly: { amount: 0 }
    }
  },
  {
    id: "starter",
    name: "Starter",
    description: "For projects moving into production.",
    features: [
      "2,000 screenshots per month",
      "40 requests per minute",
      "PNG, JPEG, WebP, PDF format",
      "No attribution link required",
      "Choose IP location"
    ],
    maxUsers: 5,
    maxScreenshots: 2000,
    prices: {
      monthly: {
        amount: 19,
        paypalPlanId: "P-STARTER-MONTHLY", // Ganti dengan ID asli Anda
        stripePriceId: "price_starter_monthly"
      },
      yearly: {
        amount: 190,
        paypalPlanId: "P-STARTER-YEARLY",
        stripePriceId: "price_starter_yearly"
      }
    }
  },
  {
    id: "pro",
    name: "Pro",
    description: "For production workloads at higher volume.",
    features: [
      "10,000 screenshots per month",
      "80 requests per minute",
      "PNG, JPEG, WebP, PDF format",
      "No attribution link required",
      "Choose IP location",
      "Priority Support"
    ],
    maxUsers: 15,
    maxScreenshots: 10000,
    prices: {
      monthly: {
        amount: 49,
        paypalPlanId: "P-PRO-MONTHLY",
        stripePriceId: "price_pro_monthly"
      },
      yearly: {
        amount: 490,
        paypalPlanId: "P-PRO-YEARLY",
        stripePriceId: "price_pro_yearly"
      }
    }
  }
];
