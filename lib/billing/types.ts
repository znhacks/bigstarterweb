// lib/billing/types.ts
export interface UnifiedVerificationResult {
  success: boolean;
  tenantId: string;
  planId: string;
  billingCycle: "monthly" | "yearly";
  amount: number;
  orderId: string; // Akan menyimpan Subscription ID
  nextBillingTime?: string; // Tanggal tagihan berikutnya dari PayPal/Stripe
}

export interface BillingProviderDriver {
  verifyPayload(payload: any, headers?: Headers): Promise<UnifiedVerificationResult>;
}
