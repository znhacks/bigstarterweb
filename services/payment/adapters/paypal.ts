// services/payment/adapters/paypal.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult,
  SubscriptionInterval
} from "../../../interfaces/payment-provider";
import { convertIdrToCurrency } from "../../exchange-rate";

//Delimiter untuk custom_id: aman karena UUID berisi '-' tapi bukan '::'
const CUSTOM_ID_DELIMITER = "::";

function encodeCustomId(tenantId: string, planId: string, interval: string, couponCode?: string): string {
  const parts = [tenantId, planId, interval];
  if (couponCode) parts.push(couponCode);
  return parts.join(CUSTOM_ID_DELIMITER);
}

function decodeCustomId(raw: string): {
  tenantId: string;
  planId?: string;
  interval?: SubscriptionInterval;
  couponCode?: string;
} {
  const parts = (raw || "").split(CUSTOM_ID_DELIMITER);
  return {
    tenantId: parts[0] || "",
    planId: parts[1] || undefined,
    interval: parts[2] as SubscriptionInterval | undefined,
    couponCode: parts[3] || undefined
  };
}

export class PayPalAdapter implements PaymentProvider {
  private clientId = process.env.PAYPAL_CLIENT_ID;
  private clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  private mode = process.env.PAYPAL_MODE || "sandbox";
  private webhookId = process.env.PAYPAL_WEBHOOK_ID;

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

    // ID plan PayPal di sisi provider (OPSIONAL). Bila tidak ada → payment-only via Orders API.
    const paypalPlanId = params.providerPriceId;

    // 1. Nominal IDR (diskon/pro-rata sudah terpotong di customPrice)
    const amountInIdr = params.customPrice ?? params.baseAmount ?? 0;
    if (!amountInIdr) {
      throw new Error("PayPal: amount tidak boleh 0 (customPrice/baseAmount wajib)");
    }

    // 2. Konversi nominal Rupiah ke USD secara real-time
    const exchange = await convertIdrToCurrency(amountInIdr, "USD");
    const usdValue = exchange.convertedAmount.toFixed(2);
    const customId = encodeCustomId(params.tenantId, params.planId, params.interval, params.couponCode);

    let approveUrl = "";
    let sessionId = "";

    if (paypalPlanId) {
      // === Provider-managed recurring: subscription dgn plan_id + pricing_scheme override ===
      const requestBody: any = {
        plan_id: paypalPlanId,
        subscriber: { email_address: params.userEmail },
        application_context: {
          user_action: "SUBSCRIBE_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: params.successUrl,
          cancel_url: params.cancelUrl
        },
        // Sematkan context penuh agar webhook bisa recover tenantId/planId/interval/couponCode
        custom_id: customId
      };

      // Penimpaan harga siklus pertama (diskon kupon / sisa kredit pro-rata)
      if (params.customPrice !== undefined) {
        requestBody.plan = {
          billing_cycles: [
            {
              sequence: 1,
              total_cycles: 1,
              pricing_scheme: { fixed_price: { value: usdValue, currency_code: "USD" } }
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
        const err = await response.json().catch(() => ({}));
        throw new Error(`PayPal Subscription failed: ${err.message || response.statusText}`);
      }

      const data = await response.json();
      const approveLink = data.links?.find((l: any) => l.rel === "approve");
      if (!approveLink) throw new Error("PayPal did not return an approval link");
      approveUrl = approveLink.href;
      sessionId = data.id;
    } else {
      // === Payment-only: Orders API one-time (TANPA plan PayPal). Plan milik kita, PayPal = alat bayar. ===
      const orderBody = {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: usdValue },
            description: `${params.planName || params.planId} - ${params.interval}`,
            custom_id: customId
          }
        ],
        application_context: {
          shipping_preference: "NO_SHIPPING",
          return_url: params.successUrl,
          cancel_url: params.cancelUrl
        }
      };

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderBody)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`PayPal Order failed: ${err.message || response.statusText}`);
      }

      const data = await response.json();
      const approveLink = data.links?.find((l: any) => l.rel === "approve");
      if (!approveLink) throw new Error("PayPal did not return an approval link");
      approveUrl = approveLink.href;
      sessionId = data.id;
    }

    return {
      checkoutUrl: approveUrl,
      sessionId
    };
  }

  /**
   * Verifikasi signature webhook PayPal via /v1/notifications/verify-webhook-signature.
   * Mencegah webhook palsu. Bila PAYPAL_WEBHOOK_ID belum diset, beri peringatan & lanjut (dev).
   */
  private async verifyWebhookSignature(rawBody: string, headers: Headers, token: string): Promise<boolean> {
    if (!this.webhookId) {
      console.warn(
        "[paypal] PAYPAL_WEBHOOK_ID belum diset — verifikasi signature dilewati. SET env ini di production!"
      );
      return true;
    }

    const transmissionId = headers.get("paypal-transmission-id");
    const transmissionTime = headers.get("paypal-transmission-time");
    const transmissionSig = headers.get("paypal-transmission-sig");
    const certUrl = headers.get("paypal-cert-url");
    const authAlgo = headers.get("paypal-auth-algo");

    if (!transmissionId || !transmissionSig || !certUrl || !authAlgo) {
      return false;
    }

    const verifyRes = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: this.webhookId,
        webhook_event: JSON.parse(rawBody)
      })
    });

    if (!verifyRes.ok) return false;
    const data = await verifyRes.json();
    return data.verification_status === "SUCCESS";
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    // Baca raw body dulu (untuk verifikasi signature), baru parse JSON
    const rawBody = await req.text();
    const headers = req.headers;
    const token = await this.getAccessToken();

    const isVerified = await this.verifyWebhookSignature(rawBody, headers, token);
    if (!isVerified) {
      throw new Error("Invalid PayPal webhook signature");
    }

    const payload = JSON.parse(rawBody);

    // Recover context dari custom_id (ada di semua event subscription & sale)
    const customIdRaw = payload.resource?.custom_id || payload.resource?.custom || "";
    const ctx = decodeCustomId(customIdRaw);

    let eventType: UnifiedWebhookResult["eventType"] = "subscription.updated";
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
    } else if (paypalEvent === "PAYMENT.SALE.COMPLETED" || paypalEvent === "PAYMENT.CAPTURE.COMPLETED") {
      eventType = "payment.succeeded";
    }

    const endsAt = payload.resource?.billing_info?.next_billing_time || undefined;

    // Amount: coba beberapa bentuk payload (subscription vs sale vs capture order)
    let amount: number | undefined;
    const amtTotal = payload.resource?.amount?.total; // SALE
    const amtValue = payload.resource?.value || payload.resource?.amount?.value; // capture order
    const lastPayment = payload.resource?.billing_info?.last_payment_amount?.value;
    if (amtTotal) amount = parseFloat(amtTotal);
    else if (amtValue) amount = parseFloat(amtValue);
    else if (lastPayment) amount = parseFloat(lastPayment);

    const currency =
      payload.resource?.amount?.currency_code ||
      payload.resource?.amount?.currency?.code ||
      payload.resource?.billing_info?.last_payment_amount?.currency_code ||
      "USD"; // PayPal kita selalu charge dalam USD (hasil konversi IDR->USD di checkout)

    return {
      eventType,
      tenantId: ctx.tenantId,
      planId: ctx.planId,
      interval: ctx.interval,
      couponCode: ctx.couponCode,
      endsAt,
      providerSubscriptionId: payload.resource?.id,
      providerCustomerId: payload.resource?.subscriber?.payer_id,
      status: payload.resource?.status?.toLowerCase() || "active",
      amount,
      currency,
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

  async reactivateSubscription(providerSubscriptionId: string): Promise<boolean> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${providerSubscriptionId}/activate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: "User reactivated via application dashboard" })
      }
    );

    return response.ok;
  }
}
