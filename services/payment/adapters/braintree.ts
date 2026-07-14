// services/payment/adapters/braintree.ts
//
// STATUS: TIDAK DIIMPLEMENTASIKAN.
// Adapter ini sebelumnya adalah stub palsu (fake checkout, no API call, no webhook signature verify).
// Demi keamanan & kejelasan, kini secara eksplisit menolak dipakai sampai dibangun nyata.
// Factory mem-filter "braintree" dari daftar provider aktif meski dicantumkan di env.

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult
} from "../../../interfaces/payment-provider";

const NOT_IMPLEMENTED = "Braintree adapter is not implemented. Remove it from NEXT_PUBLIC_ENABLED_PAYMENT_PROVIDERS or implement a real adapter.";

export class BraintreeAdapter implements PaymentProvider {
  async createCheckoutSession(_params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async handleWebhook(_req: Request): Promise<UnifiedWebhookResult> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<boolean> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
