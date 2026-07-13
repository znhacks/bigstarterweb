// services/payment/adapters/paypal.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult
} from "../../../interfaces/payment-provider";
import { plans } from "../../../config/billing";
import { convertIdrToCurrency } from "../../exchange-rate";

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

    const paypalPlanId =
      params.interval === "monthly"
        ? selectedPlan.prices.monthly.providers?.paypal
        : selectedPlan.prices.yearly.providers?.paypal;

    if (!paypalPlanId) {
      throw new Error(`PayPal Plan ID is not configured for ${params.planId}`);
    }

    // 1. Tentukan nominal harga dasar (IDR)
    const amountInIdr =
      params.customPrice !== undefined
        ? params.customPrice
        : params.interval === "monthly"
          ? selectedPlan.prices.monthly.amount
          : selectedPlan.prices.yearly.amount;

    // 2. Konversi nominal Rupiah ke USD secara real-time
    const exchange = await convertIdrToCurrency(amountInIdr, "USD");
    const finalUsdAmount = exchange.convertedAmount;

    // 3. Rakit body payload transaksi PayPal
    const requestBody: any = {
      plan_id: paypalPlanId,
      subscriber: {
        email_address: params.userEmail
      },
      application_context: {
        brand_name: "SaaS Application",
        user_action: "SUBSCRIBE_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: params.successUrl,
        cancel_url: params.cancelUrl
      },
      custom_id: params.tenantId
    };

    // 4. PAYPAL PRICING OVERRIDE (SOLUSI UTAMA):
    // Jika harga yang dikirim adalah harga terpotong pro-rata / kupon diskon,
    // instruksikan PayPal untuk menimpa harga normal pada siklus pertama penagihan.
    if (params.customPrice !== undefined) {
      requestBody.plan = {
        billing_cycles: [
          {
            sequence: 1,
            total_cycles: 1,
            pricing_scheme: {
              fixed_price: {
                value: finalUsdAmount.toString(), // Nilai potong harga USD (misal: "60.00")
                currency_code: "USD"
              }
            }
          }
        ]
      };
    }

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const err = await response.json();

      if (err.details && Array.isArray(err.details)) {
        const detailMessages = err.details
          .map((d: any) => `[Field: ${d.field}] Issue: ${d.issue} - ${d.description}`)
          .join(", ");
        throw new Error(`PayPal Subscription failed: ${err.message}. Details: ${detailMessages}`);
      }

      throw new Error(`PayPal Subscription failed: ${err.message || response.statusText}`);
    }

    const data = await response.json();
    const approveLink = data.links.find((l: any) => l.rel === "approve");

    if (!approveLink) {
      throw new Error("PayPal did not return an approval link");
    }

    return {
      checkoutUrl: approveLink.href,
      sessionId: data.id
    };
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const payload = await req.json();

    const customIdRaw = payload.resource?.custom_id || payload.resource?.custom;
    const tenantId = customIdRaw || "";

    let eventType: any = "subscription.updated";
    const paypalEvent = payload.event_type;

    if (
      paypalEvent === "BILLING.SUBSCRIPTION.CREATED" ||
      paypalEvent === "BILLING.SUBSCRIPTION.ACTIVATED"
    ) {
      eventType = "subscription.created";
    } else if (paypalEvent === "BILLING.SUBSCRIPTION.UPDATED") {
      eventType = "subscription.updated";
    } else if (
      paypalEvent === "BILLING.SUBSCRIPTION.CANCELLED" ||
      paypalEvent === "BILLING.SUBSCRIPTION.EXPIRED"
    ) {
      eventType = "subscription.deleted";
    } else if (paypalEvent === "PAYMENT.SALE.COMPLETED") {
      eventType = "payment.succeeded";
    }

    const paypalPlanId = payload.resource?.plan_id;
    const matchingPlan = plans.find(
      (p) =>
        p.prices.monthly.providers?.paypal === paypalPlanId ||
        p.prices.yearly.providers?.paypal === paypalPlanId
    );
    const planId = matchingPlan ? matchingPlan.id : undefined;

    // EKSTRAKSI TANGGAL MULAI DAN BERAKHIR RESMI DARI PAYPAL
    const startsAt = payload.resource?.start_time || undefined; // Tanggal mulai resmi
    const endsAt = payload.resource?.billing_info?.next_billing_time || undefined;

    return {
      eventType,
      tenantId,
      planId,
      startsAt, // Dikembalikan ke router
      endsAt,
      providerSubscriptionId: payload.resource?.id,
      providerCustomerId: payload.resource?.subscriber?.payer_id,
      status: payload.resource?.status?.toLowerCase() || "active",
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
