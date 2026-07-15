// services/payment/adapters/lemonsqueezy.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult,
  SubscriptionInterval
} from "../../../interfaces/payment-provider";
import { convertIdrToCurrency } from "../../exchange-rate";
import crypto from "crypto";

export class LemonSqueezyAdapter implements PaymentProvider {
  private apiKey = process.env.LEMONSQUEEZY_API_KEY;
  private baseUrl = "https://api.lemonsqueezy.com/v1";

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const variantId = params.providerPriceId;
    if (!variantId) {
      // LemonSqueezy berbasis variant — tidak mendukung payment-only tanpa variant.
      // Untuk provider payment-only (tanpa setup plan provider), gunakan Mayar/Midtrans/Xendit/Stripe.
      throw new Error(
        `LemonSqueezy memerlukan Variant ID (payment-only tanpa variant tidak didukung). ` +
          `Konfigurasi provider_ids.lemonsqueezy di plan_prices, atau gunakan provider lain.`
      );
    }

    // Diskon first-cycle via custom_price (cents) — hanya bila benar ada diskon (customPrice < baseAmount).
    // Catatan: variant harus mengizinkan custom price di dashboard LemonSqueezy; bila tidak,
    // harga normal dipakai & diskon hilang (di-warn).
    let customPriceCents: number | undefined;
    if (
      params.customPrice !== undefined &&
      params.baseAmount !== undefined &&
      params.customPrice < params.baseAmount
    ) {
      const conv = await convertIdrToCurrency(params.customPrice, "USD");
      customPriceCents = Math.round(conv.convertedAmount * 100);
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
                tenantId: params.tenantId,
                planId: params.planId,
                interval: params.interval,
                couponCode: params.couponCode ?? null
              }
            },
            product_options: {
              redirect_url: params.successUrl
            },
            ...(customPriceCents ? { custom_price: customPriceCents } : {})
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

    // Verifikasi HMAC SHA256 Lemon Squeezy
    const hmac = crypto.createHmac("sha256", process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "");
    const digest = hmac.update(rawBody).digest("hex");

    if (signature !== digest) {
      throw new Error("Invalid Lemon Squeezy signature");
    }

    const payload = JSON.parse(rawBody);
    const attributes = payload.data?.attributes || {};
    const customData = payload.meta?.custom_data || {};

    let eventType: UnifiedWebhookResult["eventType"] = "subscription.updated";
    const lemonEvent = payload.meta?.event_name;

    if (lemonEvent === "subscription_created") eventType = "subscription.created";
    if (lemonEvent === "subscription_cancelled") eventType = "subscription.deleted";
    if (lemonEvent === "order_created") eventType = "payment.succeeded";

    return {
      eventType,
      tenantId: customData.tenantId || "",
      planId: customData.planId || undefined,
      interval: customData.interval as SubscriptionInterval | undefined,
      couponCode: customData.couponCode || undefined,
      providerSubscriptionId: attributes.subscription_id?.toString() || payload.data?.id,
      providerCustomerId: attributes.customer_id?.toString(),
      status: attributes.status || "active",
      amount: attributes.total ? attributes.total / 100 : undefined,
      currency: attributes.currency || "USD",
      orderId: payload.data?.id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    // PATCH cancelled:true = batalkan di akhir periode (bukan DELETE immediate), agar bisa di-resume
    const response = await fetch(`${this.baseUrl}/subscriptions/${providerSubscriptionId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json"
      },
      body: JSON.stringify({
        data: {
          type: "subscriptions",
          id: providerSubscriptionId,
          attributes: { cancelled: true }
        }
      })
    });

    return response.ok;
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<boolean> {
    // Resume: set cancelled kembali ke false
    const response = await fetch(`${this.baseUrl}/subscriptions/${providerSubscriptionId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json"
      },
      body: JSON.stringify({
        data: {
          type: "subscriptions",
          id: providerSubscriptionId,
          attributes: { cancelled: false }
        }
      })
    });

    return response.ok;
  }
}
