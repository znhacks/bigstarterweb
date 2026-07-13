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
  planId?: string; // TAMBAHAN: Untuk menyimpan ID plan ('starter' / 'pro')
  endsAt?: string; // TAMBAHAN: Tanggal berakhir langganan
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
