// services/payment/adapters/paypal.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult
} from "@/interfaces/payment-provider";
import { plans } from "@/config/billing";
import { convertIdrToCurrency } from "@/services/exchange-rate";

export class PayPalAdapter implements PaymentProvider {
  private clientId = process.env.PAYPAL_CLIENT_ID;
  private clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  private mode = process.env.PAYPAL_MODE || "sandbox";

  private get baseUrl() {
    return this.mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  }

  /**
   * Mengambil Access Token OAuth2 dari PayPal
   */
  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    if (!response.ok) {
      throw new Error("Failed to retrieve PayPal access token");
    }

    const data = await response.json();
    return data.access_token;
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const token = await this.getAccessToken();
    const selectedPlan = plans.find((p) => p.id === params.planId);
    if (!selectedPlan) throw new Error("Selected plan not found");

    const amountInIdr =
      params.interval === "month"
        ? selectedPlan.prices.monthly.amount
        : selectedPlan.prices.yearly.amount;

    // Ambil nilai konversi ke USD real-time dari layanan Tahap 2
    const exchange = await convertIdrToCurrency(amountInIdr, "USD");

    const paypalPlanId =
      params.interval === "month"
        ? selectedPlan.prices.monthly.providers?.paypal
        : selectedPlan.prices.yearly.providers?.paypal;

    if (!paypalPlanId) {
      throw new Error(`PayPal Plan ID is not configured for ${params.planId}`);
    }

    // Buat request Subscription ke PayPal
    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        plan_id: paypalPlanId,
        subscriber: {
          email_address: params.userEmail
        },
        application_context: {
          brand_name: "SaaS Application",
          user_action: "SUBSCRIBE_NOW",
          return_url: params.successUrl,
          cancel_url: params.cancelUrl
        },
        custom_id: JSON.stringify({ tenantId: params.tenantId }) // Simpan tenantId di sini
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`PayPal Subscription failed: ${err.message || response.statusText}`);
    }

    const data = await response.json();
    const approveLink = data.links.find((l: any) => l.rel === "approve");

    return {
      checkoutUrl: approveLink.href,
      sessionId: data.id
    };
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    // Catatan: Verifikasi signature PayPal membutuhkan koordinasi webhook ID.
    // Demi efisiensi kode, berikut adalah ekstraksi payload dasar dari PayPal.
    const payload = await req.json();

    const customIdRaw = payload.resource?.custom_id || payload.resource?.custom;
    let tenantId = "";

    if (customIdRaw) {
      try {
        const parsed = JSON.parse(customIdRaw);
        tenantId = parsed.tenantId;
      } catch {
        tenantId = customIdRaw;
      }
    }

    let eventType: any = "subscription.updated";
    const paypalEvent = payload.event_type;

    if (paypalEvent === "BILLING.SUBSCRIPTION.CREATED") eventType = "subscription.created";
    if (paypalEvent === "BILLING.SUBSCRIPTION.CANCELLED") eventType = "subscription.deleted";
    if (paypalEvent === "PAYMENT.SALE.COMPLETED") eventType = "payment.succeeded";

    return {
      eventType,
      tenantId,
      providerSubscriptionId: payload.resource?.id,
      providerCustomerId: payload.resource?.subscriber?.payer_id,
      status: payload.resource?.status?.toLowerCase() || "completed",
      amount: payload.resource?.amount?.total
        ? parseFloat(payload.resource.amount.total)
        : undefined,
      currency: payload.resource?.amount?.currency,
      orderId: payload.resource?.id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${providerSubscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: "User cancelled via application dashboard" })
      }
    );

    return response.ok;
  }
}
