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
    try {
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
        const err = await response.json().catch(() => ({}));
        throw new Error(`Lemon Squeezy failed: ${err.errors?.[0]?.detail || response.statusText}`);
      }

      const data = await response.json();
      return {
        checkoutUrl: data.data.attributes.url,
        sessionId: data.data.id
      };
    } catch (e: any) {
      throw new Error(`Lemon Squeezy Checkout Session failed: ${e.message || e}`);
    }
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";

    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    // FAIL-CLOSED: secret kosong membuat HMAC dapat di-forging (HMAC atas "").
    if (!secret) {
      throw new Error(
        "[lemonsqueezy] LEMONSQUEEZY_WEBHOOK_SECRET belum diset — verifikasi signature webhook WAJIB. SET env ini sebelum menerima webhook."
      );
    }

    // Verifikasi HMAC SHA256 Lemon Squeezy + timing-safe compare.
    const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(digest, "hex");
    const ok =
      sigBuf.length === expBuf.length &&
      sigBuf.length > 0 &&
      crypto.timingSafeEqual(sigBuf, expBuf);
    if (!ok) {
      throw new Error("Invalid Lemon Squeezy signature");
    }

    const payload = JSON.parse(rawBody);
    const attributes = payload.data?.attributes || {};
    const customData = payload.meta?.custom_data || {};

    let eventType: UnifiedWebhookResult["eventType"] = "subscription.updated";
    const lemonEvent = payload.meta?.event_name;

    if (lemonEvent === "subscription_created") {
      eventType = "subscription.created";
    } else if (lemonEvent === "subscription_cancelled" || lemonEvent === "subscription_expired") {
      eventType = "subscription.deleted";
    } else if (lemonEvent === "order_created" || lemonEvent === "subscription_payment_success") {
      eventType = "payment.succeeded";
    } else if (lemonEvent === "subscription_payment_failed") {
      eventType = "payment.failed";
    } else if (lemonEvent === "subscription_updated") {
      eventType = "subscription.updated";
    }

    // Ekstraksi tanggal berakhir atau tanggal siklus tagihan berikutnya
    const endsAt = attributes.ends_at || attributes.renews_at || undefined;

    return {
      eventType,
      tenantId: customData.tenantId || "",
      planId: customData.planId || undefined,
      interval: customData.interval as SubscriptionInterval | undefined,
      couponCode: customData.couponCode || undefined,
      endsAt,
      providerSubscriptionId: attributes.subscription_id?.toString() || payload.data?.id,
      providerCustomerId: attributes.customer_id?.toString(),
      status: attributes.status || "active",
      amount: attributes.total ? attributes.total / 100 : undefined,
      currency: attributes.currency || "USD",
      orderId: payload.data?.id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    try {
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
    } catch {
      return false;
    }
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<boolean> {
    try {
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
    } catch {
      return false;
    }
  }
}
