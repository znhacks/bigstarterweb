// services/payment/adapters/stripe.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult,
  SubscriptionInterval
} from "../../../interfaces/payment-provider";
import { convertIdrToCurrency } from "../../exchange-rate";
import Stripe from "stripe";

// Cache coupon Stripe berdasarkan (currency, amount_off_cents) agar tidak membuat
// object Coupon baru untuk nilai diskon yg sama berulang-ulang.
const couponCache = new Map<string, string>();

export class StripeAdapter implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2023-10-16" as any
    });
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const stripePriceId = params.providerPriceId;
    if (!stripePriceId) {
      throw new Error(`Stripe Price ID is not configured for plan ${params.planId} (${params.interval})`);
    }

    // Ambil Price object agar tahu nominal & currency asli di sisi Stripe (akurat untuk diskon).
    const price = await this.stripe.prices.retrieve(stripePriceId);
    const priceCurrency = (price.currency || "usd").toUpperCase();
    const priceUnitAmountCents = price.unit_amount ?? 0; // cents

    // Siapkan diskon first-cycle bila ada customPrice (diskon/pro-rata) yg lebih kecil dari harga normal.
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
    if (params.customPrice !== undefined && params.baseAmount !== undefined && params.customPrice < params.baseAmount) {
      // Konversi nominal charge final (IDR) ke currency Price Stripe
      const customForeign = await convertIdrToCurrency(params.customPrice, priceCurrency);
      const customCents = Math.round(customForeign.convertedAmount * 100);
      const amountOffCents = priceUnitAmountCents - customCents;

      if (amountOffCents > 0) {
        const couponId = await this.getOrCreateCoupon(priceCurrency, amountOffCents);
        discounts = [{ coupon: couponId }];
      }
    }

    const metadata: Stripe.MetadataParam = {
      tenantId: params.tenantId,
      planId: params.planId,
      interval: params.interval,
      couponCode: params.couponCode ?? ""
    };

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: "subscription",
      customer_email: params.userEmail,
      client_reference_id: params.tenantId,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      discounts,
      metadata,
      subscription_data: {
        metadata
      }
    });

    return {
      checkoutUrl: session.url || "",
      sessionId: session.id
    };
  }

  private async getOrCreateCoupon(currency: string, amountOffCents: number): Promise<string> {
    const cacheKey = `${currency}:${amountOffCents}`;
    const cached = couponCache.get(cacheKey);
    if (cached) return cached;

    const coupon = await this.stripe.coupons.create({
      amount_off: amountOffCents,
      currency,
      duration: "once",
      name: `Discount ${amountOffCents / 100} ${currency}`
    });

    couponCache.set(cacheKey, coupon.id);
    return coupon.id;
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    // Validasi signature webhook Stripe
    const event = this.stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );

    const obj = event.data.object as any;
    const metadata = obj.metadata || {};
    const tenantId = obj.client_reference_id || metadata.tenantId || "";

    let eventType: UnifiedWebhookResult["eventType"] = "subscription.updated";
    if (event.type === "customer.subscription.created") eventType = "subscription.created";
    if (event.type === "customer.subscription.deleted") eventType = "subscription.deleted";
    if (event.type === "checkout.session.completed") eventType = "payment.succeeded";

    return {
      eventType,
      tenantId,
      planId: metadata.planId || undefined,
      interval: (metadata.interval as SubscriptionInterval) || undefined,
      couponCode: metadata.couponCode || undefined,
      providerSubscriptionId: obj.subscription || undefined,
      providerCustomerId: obj.customer || undefined,
      status: obj.payment_status || "paid",
      amount: obj.amount_total ? obj.amount_total / 100 : undefined,
      currency: obj.currency?.toUpperCase(),
      orderId: obj.id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    const canceled = await this.stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: true
    });
    return !!canceled;
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<boolean> {
    const updated = await this.stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: false
    });
    return !!updated;
  }
}
