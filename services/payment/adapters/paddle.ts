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
  private hostedCheckoutUrl = process.env.PADDLE_HOSTED_CHECKOUT_URL;

  constructor() {
    if (!this.hostedCheckoutUrl) {
      console.warn(
        "[paddle] PADDLE_HOSTED_CHECKOUT_URL belum diset di environment variable. " +
          "Sistem akan otomatis menggunakan fallback URL bawaan Paddle."
      );
    }
  }

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
        throw new Error(
          `Paddle memerlukan Price ID (payment-only tanpa price tidak didukung Paddle Billing). ` +
            `Konfigurasi provider_ids.paddle di plan_prices, atau gunakan provider lain.`
        );
      }

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
      const priceUnitCents = priceData?.data?.unit_price?.amount ?? 0;

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

      let checkoutUrl = "";

      if (this.hostedCheckoutUrl) {
        const separator = this.hostedCheckoutUrl.includes("?") ? "&" : "?";
        checkoutUrl = `${this.hostedCheckoutUrl}${separator}transaction_id=${data.data.id}`;
      } else {
        checkoutUrl =
          data.data.checkout?.url || `${this.checkoutHost}/checkout/transact/${data.data.id}`;
      }

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

    // --- PERBAIKAN CELAH 2: Bersihkan tanda kutip dari env variable Vercel ---
    const secret = (this.webhookSecret || "").replace(/['"]/g, "").trim();

    if (!secret) {
      throw new Error(
        "[paddle] PADDLE_WEBHOOK_SECRET belum diset — verifikasi signature webhook WAJIB. SET env ini sebelum menerima webhook."
      );
    }

    const sigHeader = req.headers.get("paddle-signature") || "";

    // --- PERBAIKAN CELAH 1: Lakukan safe trimming (.trim()) pada key dan value hasil split ---
    const parts = Object.fromEntries(
      sigHeader.split(";").map((kv) => {
        const [k, v] = kv.split("=");
        return [k ? k.trim() : "", v ? v.trim() : ""];
      })
    );

    const ts = parts.ts;
    const h1 = parts.h1;
    if (!ts || !h1) {
      throw new Error("Missing Paddle signature components (ts or h1)");
    }

    // Konversi Unix timestamp (detik dari Paddle) ke milidetik
    const tsMs = Number(ts) * 1000;

    // --- BYPASS REPLAY DEFENSE UNTUK LOCALHOST ATAU SANDBOX (testing) ---
    const isDevelopment = process.env.NODE_ENV !== "production";
    const isSandbox = this.mode !== "live";

    if (!isDevelopment && !isSandbox) {
      // Proteksi Replay Attack hanya aktif ketat di server produksi (Live Mode)
      if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
        const diffMinutes = Math.abs(Date.now() - tsMs) / (60 * 1000);
        throw new Error(
          `Paddle webhook stale (replay ditolak). Selisih waktu jam server Anda dengan Paddle: ${diffMinutes.toFixed(2)} menit.`
        );
      }
    } else {
      const diffMinutes = Math.abs(Date.now() - tsMs) / (60 * 1000);
      console.warn(
        `[paddle] Webhook stale check bypassed (isDevelopment: ${isDevelopment}, isSandbox: ${isSandbox}). ` +
          `Selisih waktu saat ini: ${diffMinutes.toFixed(2)} menit.`
      );
    }

    // Hitung ulang HMAC menggunakan secret yang telah dibersihkan
    const expected = crypto.createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");

    const sigBuf = Buffer.from(h1, "hex");
    const expBuf = Buffer.from(expected, "hex");
    const ok =
      sigBuf.length === expBuf.length &&
      sigBuf.length > 0 &&
      crypto.timingSafeEqual(sigBuf, expBuf);

    if (!ok) {
      console.error("[paddle] Sig verify FAILED:", {
        mode: this.mode,
        secretLength: secret.length,
        secretPrefix: secret.length > 6 ? secret.substring(0, 6) + "..." : "(too short)",
        tsLength: ts.length,
        bodyLength: rawBody.length,
        expectedH1Prefix: expected.substring(0, 16) + "...",
        receivedH1Prefix: h1.substring(0, 16) + "...",
        h1Length: h1.length,
        expectedLength: expected.length,
        lengthsMatch: h1.length === expected.length
      });
      // Di sandbox/dev, log hex lengkap utk perbandingan manual.
      if (isDevelopment || isSandbox) {
        console.warn("[paddle] DEV/SANDBOX — expected:", expected);
        console.warn("[paddle] DEV/SANDBOX — received:", h1);
      }
      throw new Error(
        "Invalid Paddle signature. Pastikan PADDLE_WEBHOOK_SECRET benar (Paddle Dashboard → Developer Tools → Notifications → Preview, BUKAN API key). Sandbox & live punya secret berbeda."
      );
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
