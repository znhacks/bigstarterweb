import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult,
  SubscriptionInterval
} from "@/interfaces/payment-provider";

export class MayarAdapter implements PaymentProvider {
  private apiKey = process.env.MAYAR_API_KEY;
  private baseUrl = "https://api.mayar.id/hl/v1";

  constructor() {
    if (!this.apiKey) {
      console.warn("[mayar] Mayar API Key belum diset di environment variable.");
    }
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    try {
      const amount = params.customPrice ?? params.baseAmount ?? 0;
      if (!amount) {
        throw new Error("Mayar: amount tidak boleh 0 (customPrice/baseAmount wajib)");
      }

      const response = await fetch(`${this.baseUrl}/payment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: params.userEmail.split("@")[0],
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
        checkoutUrl: data.payment_url,
        sessionId: data.id
      };
    } catch (e: any) {
      throw new Error(`Mayar Checkout Session failed: ${e.message || e}`);
    }
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    if (!process.env.MAYAR_WEBHOOK_TOKEN) {
      throw new Error(
        "[mayar] MAYAR_WEBHOOK_TOKEN belum diset — verifikasi token webhook WAJIB. SET env ini sebelum menerima webhook."
      );
    }

    const token = req.headers.get("x-mayar-token");

    if (token !== process.env.MAYAR_WEBHOOK_TOKEN) {
      throw new Error("Unauthorized Mayar Webhook Token");
    }

    const payload = await req.json();

    const status =
      payload.status === "settlement" || payload.status === "success" ? "paid" : "failed";

    const metadata = payload.metadata || {};
    const eventType: UnifiedWebhookResult["eventType"] =
      status === "paid" ? "payment.succeeded" : "payment.failed";

    return {
      eventType,
      tenantId: metadata.tenantId,
      planId: metadata.planId,
      interval: metadata.interval as SubscriptionInterval | undefined,
      couponCode: metadata.couponCode || undefined,
      status,
      amount: payload.amount,
      currency: "IDR",
      orderId: payload.id,

      endsAt: undefined,
      providerSubscriptionId: undefined,
      providerCustomerId: undefined
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    return true;
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<boolean> {
    return true;
  }
}
