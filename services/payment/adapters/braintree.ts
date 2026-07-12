// services/payment/adapters/braintree.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult
} from "../../../interfaces/payment-provider";
import { plans } from "../../../config/billing";

export class BraintreeAdapter implements PaymentProvider {
  private merchantId = process.env.BRAINTREE_MERCHANT_ID;
  private publicKey = process.env.BRAINTREE_PUBLIC_KEY;
  private privateKey = process.env.BRAINTREE_PRIVATE_KEY;
  private environment = process.env.BRAINTREE_ENVIRONMENT || "sandbox";

  private get baseUrl() {
    return this.environment === "production"
      ? `https://api.braintreegateway.com/merchants/${this.merchantId}`
      : `https://api.sandbox.braintreegateway.com/merchants/${this.merchantId}`;
  }

  private get authHeader(): string {
    return Buffer.from(`${this.publicKey}:${this.privateKey}`).toString("base64");
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const selectedPlan = plans.find((p) => p.id === params.planId);
    if (!selectedPlan) throw new Error("Selected plan not found");

    const braintreePlanId =
      params.interval === "month"
        ? selectedPlan.prices.monthly.providers?.braintree
        : selectedPlan.prices.yearly.providers?.braintree;

    if (!braintreePlanId) {
      throw new Error(`Braintree Plan ID is not configured for ${params.planId}`);
    }

    // Braintree Billing memerlukan pembuatan payment method token terlebih dahulu.
    // Di lingkungan server, kita mengembalikan link halaman pembayaran transisi
    // tempat pengguna dapat melakukan otorisasi aman.
    const checkoutUrl = `${params.successUrl}?setup_braintree=true&plan_id=${braintreePlanId}&tenant_id=${params.tenantId}`;

    return {
      checkoutUrl,
      sessionId: `BT-DRAFT-${params.tenantId.substring(0, 8)}`
    };
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const payload = await req.json();

    // Parsing data dasar notifikasi webhook Braintree
    const subscription = payload.subscription || {};
    const tenantId = subscription.id ? subscription.id.split("-")[1] : "";

    return {
      eventType: "subscription.updated",
      tenantId: tenantId,
      providerSubscriptionId: subscription.id,
      providerCustomerId: subscription.paymentMethodToken,
      status: subscription.status || "active",
      amount: subscription.price ? parseFloat(subscription.price) : undefined,
      currency: "USD",
      orderId: subscription.id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/subscriptions/${providerSubscriptionId}/cancel`, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${this.authHeader}`,
        "Content-Type": "application/json"
      }
    });

    return response.ok;
  }
}
