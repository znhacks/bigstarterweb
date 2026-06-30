// lib/billing/provider-layer.ts
export interface CheckoutOptions {
  tenantId: string;
  planId: string;
  interval: "monthly" | "yearly";
  provider: "stripe" | "paypal";
  successUrl: string;
  cancelUrl: string;
}

export class BillingService {
  static async createCheckoutSession(options: CheckoutOptions) {
    if (options.provider === "stripe") {
      // Panggil API Stripe SDK untuk membuat checkout session
      // return { url: stripeSession.url }
    } else if (options.provider === "paypal") {
      // Panggil API PayPal SDK
      // return { url: paypalApprovalUrl }
    }
    throw new Error("Provider not supported");
  }

  static async redirectToBillingPortal(tenantId: string, provider: "stripe" | "paypal") {
    if (provider === "stripe") {
      // Generate Stripe Customer Portal Link agar user bisa ganti kartu kredit / download invoice
    } else {
      // Redirect ke halaman detail langganan PayPal merchant
    }
  }
}
