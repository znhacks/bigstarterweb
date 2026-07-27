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
    try {
      const stripePriceId = params.providerPriceId;
      const interval = params.interval === "yearly" ? "year" : "month";

      const metadata: Stripe.MetadataParam = {
        tenantId: params.tenantId,
        planId: params.planId,
        interval: params.interval,
        couponCode: params.couponCode ?? ""
      };

      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
      let discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];

      if (stripePriceId) {
        // === Provider-managed recurring: pakai Price ID bawaan Stripe + Coupon utk diskon ===
        const price = await this.stripe.prices.retrieve(stripePriceId);
        const priceCurrency = (price.currency || "usd").toUpperCase();
        const priceUnitAmountCents = price.unit_amount ?? 0;

        lineItems = [{ price: stripePriceId, quantity: 1 }];

        if (
          params.customPrice !== undefined &&
          params.baseAmount !== undefined &&
          params.customPrice < params.baseAmount
        ) {
          const customForeign = await convertIdrToCurrency(params.customPrice, priceCurrency);
          const customCents = Math.round(customForeign.convertedAmount * 100);
          const amountOffCents = priceUnitAmountCents - customCents;
          if (amountOffCents > 0) {
            const couponId = await this.getOrCreateCoupon(priceCurrency, amountOffCents);
            discounts = [{ coupon: couponId }];
          }
        }
      } else {
        // === Payment-only: inline price_data (TANPA pre-create Price di Stripe) ===
        // Plan milik kita; Stripe hanya alat pembayaran. Amount = customPrice (diskon langsung di unit_amount).
        const chargeIdr = params.customPrice ?? params.baseAmount ?? 0;
        if (!chargeIdr) {
          throw new Error("Stripe: amount tidak boleh 0 (customPrice/baseAmount wajib)");
        }
        const conv = await convertIdrToCurrency(chargeIdr, "USD");
        const unitAmountCents = Math.round(conv.convertedAmount * 100);

        lineItems = [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              product_data: { name: params.planName || params.planId },
              unit_amount: unitAmountCents,
              recurring: { interval }
            }
          }
        ];
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
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
    } catch (e: any) {
      throw new Error(`Stripe Checkout Session failed: ${e.message || e}`);
    }
  }

  private async getOrCreateCoupon(currency: string, amountOffCents: number): Promise<string> {
    const cacheKey = `${currency}:${amountOffCents}`;
    const cached = couponCache.get(cacheKey);
    if (cached) return cached;

    try {
      const coupon = await this.stripe.coupons.create({
        amount_off: amountOffCents,
        currency,
        duration: "once",
        name: `Discount ${amountOffCents / 100} ${currency}`
      });

      couponCache.set(cacheKey, coupon.id);
      return coupon.id;
    } catch (e: any) {
      throw new Error(`Stripe Coupon creation failed: ${e.message || e}`);
    }
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error(
        "[stripe] STRIPE_WEBHOOK_SECRET belum diset — verifikasi signature webhook WAJIB. SET env ini sebelum menerima webhook."
      );
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    // Validasi signature webhook Stripe
    const event = this.stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const obj = event.data.object as any;
    const metadata = obj.metadata || {};
    const tenantId = obj.client_reference_id || metadata.tenantId || "";

    let eventType: UnifiedWebhookResult["eventType"] = "subscription.updated";
    if (event.type === "customer.subscription.created") {
      eventType = "subscription.created";
    } else if (event.type === "customer.subscription.deleted") {
      eventType = "subscription.deleted";
    } else if (
      event.type === "checkout.session.completed" ||
      event.type === "invoice.payment_succeeded"
    ) {
      eventType = "payment.succeeded";
    } else if (event.type === "invoice.payment_failed") {
      eventType = "payment.failed";
    }

    // Ekstraksi UNIX timestamp masa aktif berikutnya ke format ISO string
    let endsAt: string | undefined = undefined;
    if (obj.current_period_end) {
      endsAt = new Date(obj.current_period_end * 1000).toISOString();
    }

    // Tentukan ID Subscription yang stabil:
    // Jika event dipicu langsung oleh objek subscription, ambil obj.id
    const providerSubscriptionId =
      obj.subscription || (event.type.startsWith("customer.subscription.") ? obj.id : undefined);

    const providerCustomerId = obj.customer || undefined;

    return {
      eventType,
      tenantId,
      planId: metadata.planId || undefined,
      interval: (metadata.interval as SubscriptionInterval) || undefined,
      couponCode: metadata.couponCode || undefined,
      endsAt,
      providerSubscriptionId,
      providerCustomerId,
      status: obj.payment_status || obj.status || "active",
      amount: obj.amount_total ? obj.amount_total / 100 : undefined,
      currency: obj.currency?.toUpperCase() || "USD",
      orderId: obj.id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    try {
      const canceled = await this.stripe.subscriptions.update(providerSubscriptionId, {
        cancel_at_period_end: true
      });
      return !!canceled;
    } catch {
      return false;
    }
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<boolean> {
    try {
      const updated = await this.stripe.subscriptions.update(providerSubscriptionId, {
        cancel_at_period_end: false
      });
      return !!updated;
    } catch {
      return false;
    }
  }
}
