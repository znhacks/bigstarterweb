// services/payment/adapters/paddle.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult
} from "@/interfaces/payment-provider";
import { plans } from "@/config/billing";

export class PaddleAdapter implements PaymentProvider {
  private apiKey = process.env.PADDLE_API_KEY;
  private mode = process.env.PADDLE_MODE || "sandbox";

  private get baseUrl() {
    return this.mode === "live" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const selectedPlan = plans.find((p) => p.id === params.planId);
    if (!selectedPlan) throw new Error("Selected plan not found");

    const paddlePriceId =
      params.interval === "month"
        ? selectedPlan.prices.monthly.providers?.paddle
        : selectedPlan.prices.yearly.providers?.paddle;

    if (!paddlePriceId) {
      throw new Error(`Paddle Price ID is not configured for ${params.planId}`);
    }

    // Generate draft transaction untuk memicu checkout Paddle Billing
    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [
          {
            price_id: paddlePriceId,
            quantity: 1
          }
        ],
        custom_data: {
          tenantId: params.tenantId
        },
        checkout: {
          confirm_url: params.successUrl
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(
        `Paddle Transaction Creation failed: ${err.error?.message || response.statusText}`
      );
    }

    const data = await response.json();

    // Paddle Billing menggunakan transaksi draf untuk menginisiasi checkout di frontend
    // Anda bisa mengarahkan user ke URL transaksi Paddle Sandbox/Live
    const checkoutUrl = `${this.mode === "live" ? "https://checkout.paddle.com" : "https://sandbox-checkout.paddle.com"}/checkout/tx_${data.data.id}`;

    return {
      checkoutUrl,
      sessionId: data.data.id
    };
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const payload = await req.json();
    const eventTypeRaw = payload.event_type;
    const data = payload.data;
    const tenantId = data.custom_data?.tenantId || "";

    let eventType: any = "subscription.updated";
    if (eventTypeRaw === "subscription.created") eventType = "subscription.created";
    if (eventTypeRaw === "subscription.canceled") eventType = "subscription.deleted";
    if (eventTypeRaw === "transaction.completed") eventType = "payment.succeeded";

    return {
      eventType,
      tenantId,
      providerSubscriptionId: data.subscription_id || data.id,
      providerCustomerId: data.customer_id,
      status: data.status || "completed",
      amount: data.details?.totals?.grand_total
        ? parseFloat(data.details.totals.grand_total) / 100
        : undefined,
      currency: data.currency_code,
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
}
