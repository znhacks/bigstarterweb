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
  providerPriceId?: string;
  planName?: string;
  baseAmount?: number;
  currency?: string;
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
  couponCode?: string;
}

export interface PaymentProvider {
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult>;
  handleWebhook(req: Request): Promise<UnifiedWebhookResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<boolean>;

  reactivateSubscription?(providerSubscriptionId: string): Promise<boolean>;
}
