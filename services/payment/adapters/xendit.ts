// services/payment/adapters/xendit.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult
} from "../../../interfaces/payment-provider";
import { plans } from "../../../config/billing";

export class XenditAdapter implements PaymentProvider {
  private apiKey = process.env.XENDIT_API_KEY || "";
  private baseUrl = "https://api.xendit.co";

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const selectedPlan = plans.find((p) => p.id === params.planId);
    if (!selectedPlan) throw new Error("Selected plan not found");

    const amount =
      params.interval === "month"
        ? selectedPlan.prices.monthly.amount
        : selectedPlan.prices.yearly.amount;

    const externalId = `XEN-${params.tenantId.substring(0, 8)}-${Date.now()}`;
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
        description: `Upgrade ke paket ${selectedPlan.name}`,
        success_redirect_url: params.successUrl,
        failure_redirect_url: params.cancelUrl
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

    const externalId = payload.external_id || "";
    const tenantPrefix = externalId.split("-")[1] || "";

    const status = payload.status === "PAID" ? "paid" : "failed";

    return {
      eventType: status === "paid" ? "payment.succeeded" : "payment.failed",
      tenantId: tenantPrefix,
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
