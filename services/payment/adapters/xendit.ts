// services/payment/adapters/xendit.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult,
  SubscriptionInterval
} from "../../../interfaces/payment-provider";

export class XenditAdapter implements PaymentProvider {
  private apiKey = process.env.XENDIT_API_KEY || "";
  private baseUrl = "https://api.xendit.co";

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    // IDR-native one-time charge: diskon/pro-rata langsung diterapkan via customPrice
    const amount = params.customPrice ?? params.baseAmount ?? 0;
    if (!amount) throw new Error("Xendit: amount tidak boleh 0 (customPrice/baseAmount wajib)");

    // external_id hanya untuk keunikan & tampilan. Context penuh disimpan di metadata
    // (bukan di external_id) agar tenantId tidak terpotong oleh split("-").
    const externalId = `XEN-${Date.now()}-${params.tenantId.substring(0, 8)}`;
    const authHeader = Buffer.from(`${this.apiKey}:`).toString("base64");

    const response = await fetch(`${this.baseUrl}/v2/invoices`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        external_id: externalId,
        amount: amount,
        payer_email: params.userEmail,
        description: `Upgrade ke paket ${params.planName ?? params.planId}`,
        success_redirect_url: params.successUrl,
        failure_redirect_url: params.cancelUrl,
        metadata: {
          tenantId: params.tenantId,
          planId: params.planId,
          interval: params.interval,
          couponCode: params.couponCode ?? null
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Xendit failed: ${err.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      checkoutUrl: data.invoice_url,
      sessionId: data.id
    };
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const payload = await req.json();
    const token = req.headers.get("x-callback-token");

    // Verifikasi Token Callback Xendit
    if (token !== process.env.XENDIT_CALLBACK_TOKEN) {
      throw new Error("Unauthorized Xendit callback token");
    }

    // Ambil context penuh dari metadata (bukan dari external_id)
    const metadata = payload.metadata || {};
    const tenantId: string = metadata.tenantId || "";
    const planId: string | undefined = metadata.planId;
    const interval: SubscriptionInterval | undefined = metadata.interval;
    const couponCode: string | undefined = metadata.couponCode || undefined;

    const status = payload.status === "PAID" ? "paid" : "failed";

    return {
      eventType: status === "paid" ? "payment.succeeded" : "payment.failed",
      tenantId,
      planId,
      interval,
      couponCode,
      status: status,
      amount: payload.amount,
      currency: payload.currency || "IDR",
      orderId: payload.id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    return true; // One-time invoice, cancel otomatis berhasil
  }
}
