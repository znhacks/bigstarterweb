// services/payment/adapters/mayar.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult
} from "@/interfaces/payment-provider";

export class MayarAdapter implements PaymentProvider {
  private apiKey = process.env.MAYAR_API_KEY;
  private baseUrl = "https://api.mayar.id/hl/v1";

  constructor() {
    if (!this.apiKey) {
      console.warn("Mayar API Key is missing");
    }
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    // IDR-native one-time charge: diskon/pro-rata langsung diterapkan via customPrice
    const amount = params.customPrice ?? params.baseAmount ?? 0;
    if (!amount) throw new Error("Mayar: amount tidak boleh 0 (customPrice/baseAmount wajib)");

    // Membuat pembayaran kustom menggunakan API Mayar
    const response = await fetch(`${this.baseUrl}/payment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: params.userEmail.split("@")[0], // Fallback nama dari email
        email: params.userEmail,
        amount: amount,
        description: `Subscription ${params.planName ?? params.planId} - ${params.interval}`,
        redirect_url: params.successUrl,
        metadata: {
          tenantId: params.tenantId,
          userId: params.userId,
          planId: params.planId,
          interval: params.interval,
          couponCode: params.couponCode ?? null
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Mayar checkout failed: ${errData.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      checkoutUrl: data.payment_url, // URL halaman pembayaran Mayar
      sessionId: data.id
    };
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const token = req.headers.get("x-mayar-token");

    // Verifikasi token webhook demi keamanan
    if (token !== process.env.MAYAR_WEBHOOK_TOKEN) {
      throw new Error("Unauthorized Mayar Webhook Token");
    }

    const payload = await req.json();

    // Petakan status transaksi dari Mayar ke status sistem kita
    const status =
      payload.status === "settlement" || payload.status === "success" ? "paid" : "failed";

    const metadata = payload.metadata || {};

    return {
      eventType: status === "paid" ? "payment.succeeded" : "payment.failed",
      tenantId: metadata.tenantId,
      planId: metadata.planId,
      interval: metadata.interval,
      couponCode: metadata.couponCode,
      status: status,
      amount: payload.amount,
      currency: "IDR",
      orderId: payload.id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    // Catatan: Karena Mayar payment link defaultnya adalah one-time charge,
    // pembatalan subscription dikembalikan true secara otomatis
    return true;
  }
}
