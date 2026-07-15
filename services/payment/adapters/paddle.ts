// services/payment/adapters/paddle.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult,
  SubscriptionInterval
} from "@/interfaces/payment-provider";
import { convertIdrToCurrency } from "../../exchange-rate";
import crypto from "crypto";

export class PaddleAdapter implements PaymentProvider {
  private apiKey = process.env.PADDLE_API_KEY;
  private webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  private mode = process.env.PADDLE_MODE || "sandbox";

  private get baseUrl() {
    return this.mode === "live" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  }

  private get checkoutHost() {
    return this.mode === "live" ? "https://checkout.paddle.com" : "https://sandbox-checkout.paddle.com";
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const paddlePriceId = params.providerPriceId;
    if (!paddlePriceId) {
      // Paddle Billing berbasis price object — tidak mendukung payment-only tanpa price.
      // Untuk provider payment-only (tanpa setup plan provider), gunakan Mayar/Midtrans/Xendit/Stripe.
      throw new Error(
        `Paddle memerlukan Price ID (payment-only tanpa price tidak didukung Paddle Billing). ` +
          `Konfigurasi provider_ids.paddle di plan_prices, atau gunakan provider lain.`
      );
    }

    // Ambil Price object Paddle untuk mengetahui currency & nominal asli (akurat untuk diskon).
    const priceRes = await fetch(`${this.baseUrl}/prices/${paddlePriceId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    });
    if (!priceRes.ok) {
      throw new Error(`Paddle price lookup failed: ${priceRes.statusText}`);
    }
    const priceData = await priceRes.json();
    const priceCurrency = (priceData?.data?.currency_code || "USD").toUpperCase();
    const priceUnitCents = priceData?.data?.unit_price?.amount ?? 0; // Paddle simpan dalam cents

    // Diskon first-cycle bila customPrice < baseAmount
    let discounts: { id: string }[] | undefined;
    if (params.customPrice !== undefined && params.baseAmount !== undefined && params.customPrice < params.baseAmount) {
      const customForeign = await convertIdrToCurrency(params.customPrice, priceCurrency);
      const customCents = Math.round(customForeign.convertedAmount * 100);
      const amountOffCents = priceUnitCents - customCents;

      if (amountOffCents > 0) {
        const discountId = await this.createDiscount(priceCurrency, amountOffCents);
        if (discountId) discounts = [{ id: discountId }];
      }
    }

    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [{ price_id: paddlePriceId, quantity: 1 }],
        discounts,
        custom_data: {
          tenantId: params.tenantId,
          planId: params.planId,
          interval: params.interval,
          couponCode: params.couponCode ?? null
        },
        checkout: {
          confirm_url: params.successUrl
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Paddle Transaction Creation failed: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const checkoutUrl = `${this.checkoutHost}/checkout/tx_${data.data.id}`;

    return {
      checkoutUrl,
      sessionId: data.data.id
    };
  }

  private async createDiscount(currency: string, amountOffCents: number): Promise<string | null> {
    const res = await fetch(`${this.baseUrl}/discounts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "amount",
        amount: (amountOffCents / 100).toFixed(2),
        currency_code: currency,
        enabled: true
      })
    });
    if (!res.ok) {
      console.warn("[paddle] Gagal membuat discount:", res.statusText);
      return null;
    }
    const data = await res.json();
    return data?.data?.id ?? null;
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const rawBody = await req.text();

    // Verifikasi signature Paddle (format: "ts=...;h1=...")
    if (this.webhookSecret) {
      const sigHeader = req.headers.get("paddle-signature") || "";
      const parts = Object.fromEntries(sigHeader.split(";").map((kv) => kv.split("=")));
      const ts = parts.ts;
      const h1 = parts.h1;
      if (!ts || !h1) throw new Error("Missing Paddle signature");
      const expected = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(`${ts}:${rawBody}`)
        .digest("hex");
      if (expected !== h1) throw new Error("Invalid Paddle signature");
    } else {
      console.warn("[paddle] PADDLE_WEBHOOK_SECRET belum diset — verifikasi signature dilewati. SET env ini di production!");
    }

    const payload = JSON.parse(rawBody);
    const eventTypeRaw = payload.event_type;
    const data = payload.data || {};
    const customData = data.custom_data || {};

    let eventType: UnifiedWebhookResult["eventType"] = "subscription.updated";
    if (eventTypeRaw === "subscription.created") eventType = "subscription.created";
    if (eventTypeRaw === "subscription.canceled") eventType = "subscription.deleted";
    if (eventTypeRaw === "transaction.completed") eventType = "payment.succeeded";

    return {
      eventType,
      tenantId: customData.tenantId || "",
      planId: customData.planId || undefined,
      interval: customData.interval as SubscriptionInterval | undefined,
      couponCode: customData.couponCode || undefined,
      providerSubscriptionId: data.subscription_id || data.id,
      providerCustomerId: data.customer_id,
      status: data.status || "completed",
      amount: data.details?.totals?.grand_total
        ? parseFloat(data.details.totals.grand_total) / 100
        : undefined,
      currency: data.currency_code || "USD",
      orderId: data.id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/subscriptions/${providerSubscriptionId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ effective_from: "next_billing_period" })
    });

    return response.ok;
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<boolean> {
    // Undo scheduled cancellation: hapus scheduled_change (Paddle Billing update subscription)
    const response = await fetch(`${this.baseUrl}/subscriptions/${providerSubscriptionId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ scheduled_change: null })
    });

    return response.ok;
  }
}
