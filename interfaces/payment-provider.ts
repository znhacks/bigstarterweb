// interfaces/payment-provider.ts

export type SubscriptionInterval = "monthly" | "yearly";

export interface CreateCheckoutSessionParams {
  tenantId: string;
  userId: string;
  userEmail: string;
  planId: string;
  interval: SubscriptionInterval;
  successUrl: string;
  cancelUrl: string;
  customPrice?: number;
  /**
   * ID plan/price/variant di sisi provider (dari plan_prices.provider_ids[provider]). OPSIONAL.
   * - Jika ADA: gunakan langganan rekuren bawaan provider (auto-renew via provider).
   * - Jika ABSEN: payment-only — adapter charge amount kita langsung tanpa plan provider.
   *   Didukung: Mayar/Midtrans/Xendit (native), Stripe (inline price_data), PayPal (Orders API).
   *   Paddle/LemonSqueezy butuh ID (tidak mendukung payment-only) → throw error jika kosong.
   */
  providerPriceId?: string;
  /** Nama plan untuk deskripsi invoice. */
  planName?: string;
  /** Harga IDR asli (sebelum diskon/pro-rata). Dipakai adapter invoice saat customPrice absen & adapter foreign untuk hitung delta diskon. */
  baseAmount?: number;
  /** Mata uang base amount & customPrice (default "IDR"). */
  currency?: string;
  /** Kode kupon — disematkan ke metadata provider agar webhook bisa decrement kuota saat pembayaran sukses. */
  couponCode?: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId?: string;
}

export type WebhookEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.deleted"
  | "payment.succeeded"
  | "payment.failed";

export interface UnifiedWebhookResult {
  eventType: WebhookEventType;
  tenantId: string;
  planId?: string;
  /** Interval langganan (monthly/yearly) — agar webhook bisa hitung ends_at saat grant subscription via payment.succeeded. */
  interval?: SubscriptionInterval;
  startsAt?: string;
  endsAt?: string;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  status: string;
  amount?: number;
  currency?: string;
  orderId?: string;
  taxAmount?: number;
  feeAmount?: number;
  /** Kode kupon yang dipakai checkout — dibaca dari metadata provider untuk redeem kuota. */
  couponCode?: string;
}

export interface PaymentProvider {
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult>;
  handleWebhook(req: Request): Promise<UnifiedWebhookResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<boolean>;
  /**
   * Reaktivasi langganan di gateway (mis. setelah cancel_at_period_end).
   * Opsional: hanya adapter berbasis subscription (paypal/stripe/paddle/lemonsqueezy) yang mengimplementasikan.
   * Adapter invoice (one-time charge) tidak punya langganan berulang untuk direaktivasi.
   */
  reactivateSubscription?(providerSubscriptionId: string): Promise<boolean>;
}
