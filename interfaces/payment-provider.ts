// interfaces/payment-provider.ts

// Kita definisikan tipe ini di sini agar mandiri (self-contained)
export type SubscriptionInterval = "month" | "year";

export interface CreateCheckoutSessionParams {
  tenantId: string;
  userId: string;
  userEmail: string;
  planId: string;
  interval: SubscriptionInterval;
  successUrl: string;
  cancelUrl: string;
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
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  status: string;
  amount?: number;
  currency?: string;
  orderId?: string;
}

export interface PaymentProvider {
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult>;
  handleWebhook(req: Request): Promise<UnifiedWebhookResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<boolean>;
}
