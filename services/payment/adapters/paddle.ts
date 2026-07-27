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
    return this.mode === "live"
      ? "https://checkout.paddle.com"
      : "https://sandbox-checkout.paddle.com";
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    try {
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
        const err = await priceRes.json().catch(() => ({}));
        const detail = err.error?.detail || err.error?.message || priceRes.statusText;
        throw new Error(`Paddle price lookup failed: ${detail}`);
      }
      const priceData = await priceRes.json();
      const priceCurrency = (priceData?.data?.currency_code || "USD").toUpperCase();
      const priceUnitCents = priceData?.data?.unit_price?.amount ?? 0; // Paddle simpan dalam cents

      // Diskon first-cycle bila customPrice < baseAmount
      let discounts: { id: string }[] | undefined;
      if (
        params.customPrice !== undefined &&
        params.baseAmount !== undefined &&
        params.customPrice < params.baseAmount
      ) {
        const customForeign = await convertIdrToCurrency(params.customPrice, priceCurrency);
        const customCents = Math.round(customForeign.convertedAmount * 100);
        const amountOffCents = priceUnitCents - customCents;

        if (amountOffCents > 0) {
          const discountId = await this.createDiscount(priceCurrency, amountOffCents);
          if (discountId) discounts = [{ id: discountId }];
        }
      }

      // Membangun request body secara dinamis guna menghindari pengiriman parameter kosong/null
      const requestBody: any = {
        items: [{ price_id: paddlePriceId, quantity: 1 }],
        custom_data: {
          tenantId: params.tenantId,
          planId: params.planId,
          interval: params.interval,
          couponCode: params.couponCode ?? null
        },
        checkout: {
          confirm_url: params.successUrl
        }
      };

      if (discounts && discounts.length > 0) {
        requestBody.discounts = discounts;
      }

      const response = await fetch(`${this.baseUrl}/transactions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));

        // Mengekstrak informasi terperinci langsung dari struktur respon error API Paddle v3
        const errDetail = err.error?.detail || err.error?.message || response.statusText;
        const errCode = err.error?.code ? ` [Code: ${err.error.code}]` : "";

        let validationDetails = "";
        if (Array.isArray(err.error?.errors)) {
          validationDetails =
            " -> " + err.error.errors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
        }

        throw new Error(
          `Paddle Transaction Creation failed: ${errDetail}${errCode}${validationDetails}`
        );
      }

      const data = await response.json();
      const checkoutUrl = `${this.checkoutHost}/checkout/tx_${data.data.id}`;

      return {
        checkoutUrl,
        sessionId: data.data.id
      };
    } catch (e: any) {
      throw new Error(`Paddle Checkout Session failed: ${e.message || e}`);
    }
  }

  private async createDiscount(currency: string, amountOffCents: number): Promise<string | null> {
    try {
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
    } catch {
      return null;
    }
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const rawBody = await req.text();

    // FAIL-CLOSED: tanpa PADDLE_WEBHOOK_SECRET, signature TIDAK dapat diverifikasi.
    if (!this.webhookSecret) {
      throw new Error(
        "[paddle] PADDLE_WEBHOOK_SECRET belum diset — verifikasi signature webhook WAJIB. SET env ini sebelum menerima webhook."
      );
    }

    // Verifikasi signature Paddle (format: "ts=...;h1=...") + timing-safe compare.
    const sigHeader = req.headers.get("paddle-signature") || "";
    const parts = Object.fromEntries(sigHeader.split(";").map((kv) => kv.split("=")));
    const ts = parts.ts;
    const h1 = parts.h1;
    if (!ts || !h1) {
      throw new Error("Missing Paddle signature");
    }
    // Replay defense: tolak webhook stale (>5 menit dari timestamp Paddle).
    const tsMs = Number(ts);
    if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
      throw new Error("Paddle webhook stale (replay ditolak)");
    }
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(`${ts}:${rawBody}`)
      .digest("hex");
    const sigBuf = Buffer.from(h1, "hex");
    const expBuf = Buffer.from(expected, "hex");
    const ok =
      sigBuf.length === expBuf.length &&
      sigBuf.length > 0 &&
      crypto.timingSafeEqual(sigBuf, expBuf);
    if (!ok) {
      throw new Error("Invalid Paddle signature");
    }

    const payload = JSON.parse(rawBody);
    const eventTypeRaw = payload.event_type;
    const data = payload.data || {};
    const customData = data.custom_data || {};

    let eventType: UnifiedWebhookResult["eventType"] = "subscription.updated";
    if (eventTypeRaw === "subscription.created" || eventTypeRaw === "subscription.activated") {
      eventType = "subscription.created";
    } else if (
      eventTypeRaw === "subscription.canceled" ||
      eventTypeRaw === "subscription.deleted"
    ) {
      eventType = "subscription.deleted";
    } else if (eventTypeRaw === "transaction.completed") {
      eventType = "payment.succeeded";
    } else if (eventTypeRaw === "transaction.payment_failed") {
      eventType = "payment.failed";
    }

    // Ekstraksi tanggal perpanjangan / habis masa aktif dari skema Paddle Billing
    const endsAt = data.next_billed_at || data.current_billing_period?.ends_at || undefined;

    return {
      eventType,
      tenantId: customData.tenantId || "",
      planId: customData.planId || undefined,
      interval: customData.interval as SubscriptionInterval | undefined,
      couponCode: customData.couponCode || undefined,
      endsAt,
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
    try {
      const response = await fetch(
        `${this.baseUrl}/subscriptions/${providerSubscriptionId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ effective_from: "next_billing_period" })
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<boolean> {
    try {
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
    } catch {
      return false;
    }
  }
}
