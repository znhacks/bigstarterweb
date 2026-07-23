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
    const amount = params.customPrice ?? params.baseAmount ?? 0;
    if (!amount) throw new Error("Xendit: amount tidak boleh 0 (customPrice/baseAmount wajib)");

    // --- ENCODE METADATA KE DALAM EXTERNAL_ID ---
    // Gunakan pemisah "__" yang aman dari bentrokan tanda minus "-" pada UUID tenantId
    const externalId = `XEN__${params.tenantId}__${params.planId}__${params.interval || "monthly"}${
      params.couponCode ? `__${params.couponCode}` : ""
    }`;

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
        // Kita tetap mengirim metadata sebagai cadangan log resmi di dashboard Xendit
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

    // --- DECODE METADATA DARI EXTERNAL_ID ---
    const externalId = payload.external_id || "";
    let tenantId = "";
    let planId: string | undefined;
    let interval: SubscriptionInterval | undefined;
    let couponCode: string | undefined;

    // Lakukan ekstraksi jika external_id diawali dengan prefix buatan kita
    if (externalId.startsWith("XEN__")) {
      const parts = externalId.split("__");
      tenantId = parts[1] || "";
      planId = parts[2];
      interval = parts[3] as SubscriptionInterval;
      couponCode = parts[4] || undefined;
    } else {
      // Fallback jika ada invoice lama atau manual di luar sistem Next.js
      const metadata = payload.metadata || {};
      tenantId = metadata.tenantId || "";
      planId = metadata.planId;
      interval = metadata.interval;
      couponCode = metadata.couponCode || undefined;
    }

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
