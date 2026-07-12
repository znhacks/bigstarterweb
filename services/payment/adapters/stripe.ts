// services/payment/adapters/stripe.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult
} from "../../../interfaces/payment-provider";
import { plans } from "../../../config/billing";
import Stripe from "stripe";

export class StripeAdapter implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2023-10-16" as any
    });
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const selectedPlan = plans.find((p) => p.id === params.planId);
    if (!selectedPlan) throw new Error("Selected plan not found");

    const stripePriceId =
      params.interval === "month"
        ? selectedPlan.prices.monthly.providers?.stripe
        : selectedPlan.prices.yearly.providers?.stripe;

    if (!stripePriceId) {
      throw new Error(`Stripe Price ID is not configured for ${params.planId}`);
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1
        }
      ],
      mode: "subscription",
      customer_email: params.userEmail,
      client_reference_id: params.tenantId, // Menyimpan tenantId secara aman
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId
      }
    });

    return {
      checkoutUrl: session.url || "",
      sessionId: session.id
    };
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    // Validasi keaslian signature webhook dari server Stripe
    const event = this.stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );

    const session = event.data.object as any;
    const tenantId = session.client_reference_id || "";

    let eventType: any = "subscription.updated";
    if (event.type === "customer.subscription.created") eventType = "subscription.created";
    if (event.type === "customer.subscription.deleted") eventType = "subscription.deleted";
    if (event.type === "checkout.session.completed") eventType = "payment.succeeded";

    return {
      eventType,
      tenantId,
      providerSubscriptionId: session.subscription || undefined,
      providerCustomerId: session.customer || undefined,
      status: session.payment_status || "paid",
      amount: session.amount_total ? session.amount_total / 100 : undefined,
      currency: session.currency?.toUpperCase(),
      orderId: session.id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    const canceled = await this.stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: true
    });
    return !!canceled;
  }
}
