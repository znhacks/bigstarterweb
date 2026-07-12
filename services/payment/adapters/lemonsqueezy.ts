// services/payment/adapters/lemonsqueezy.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult
} from "../../../interfaces/payment-provider";
import { plans } from "../../../config/billing";
import crypto from "crypto";

export class LemonSqueezyAdapter implements PaymentProvider {
  private apiKey = process.env.LEMONSQUEEZY_API_KEY;
  private baseUrl = "https://api.lemonsqueezy.com/v1";

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const selectedPlan = plans.find((p) => p.id === params.planId);
    if (!selectedPlan) throw new Error("Selected plan not found");

    const variantId =
      params.interval === "month"
        ? selectedPlan.prices.monthly.providers?.lemonsqueezy
        : selectedPlan.prices.yearly.providers?.lemonsqueezy;

    if (!variantId) {
      throw new Error(`Lemon Squeezy Variant ID is not configured for ${params.planId}`);
    }

    const response = await fetch(`${this.baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json"
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: params.userEmail,
              custom: {
                tenantId: params.tenantId // Menyimpan metadata internal
              }
            },
            product_options: {
              redirect_url: params.successUrl
            }
          },
          relationships: {
            store: {
              data: { type: "stores", id: process.env.LEMONSQUEEZY_STORE_ID || "" }
            },
            variant: {
              data: { type: "variants", id: variantId }
            }
          }
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Lemon Squeezy failed: ${err.errors?.[0]?.detail || response.statusText}`);
    }

    const data = await response.json();
    return {
      checkoutUrl: data.data.attributes.url,
      sessionId: data.data.id
    };
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";

    // Verifikasi keaslian hash HMAC SHA256 dari Lemon Squeezy
    const hmac = crypto.createHmac("sha256", process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "");
    const digest = hmac.update(rawBody).digest("hex");

    if (signature !== digest) {
      throw new Error("Invalid Lemon Squeezy signature");
    }

    const payload = JSON.parse(rawBody);
    const attributes = payload.data.attributes;
    const customData = payload.meta?.custom_data || {};
    const tenantId = customData.tenantId || "";

    let eventType: any = "subscription.updated";
    const lemonEvent = payload.meta.event_name;

    if (lemonEvent === "subscription_created") eventType = "subscription.created";
    if (lemonEvent === "subscription_cancelled") eventType = "subscription.deleted";
    if (lemonEvent === "order_created") eventType = "payment.succeeded";

    return {
      eventType,
      tenantId,
      providerSubscriptionId: attributes.subscription_id?.toString() || payload.data.id,
      providerCustomerId: attributes.customer_id?.toString(),
      status: attributes.status || "active",
      amount: attributes.total ? attributes.total / 100 : undefined,
      currency: attributes.currency || "USD",
      orderId: payload.data.id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/subscriptions/${providerSubscriptionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json"
      }
    });

    return response.ok;
  }
}
