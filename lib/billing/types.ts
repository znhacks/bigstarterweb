// lib/billing/types.ts

export interface UnifiedVerificationResult {
  success: boolean;
  tenantId: string; // ID Organisasi
  planId: string; // 'starter', 'pro', dll.
  billingCycle: "monthly" | "yearly";
  amount: number; // Jumlah uang yang dibayar
  orderId: string; // ID transaksi unik dari provider
}

export interface BillingProviderDriver {
  // Fungsi untuk memverifikasi transaksi (baik dari webhook maupun pemanggilan langsung)
  verifyPayload(payload: any, headers?: Headers): Promise<UnifiedVerificationResult>;
}
