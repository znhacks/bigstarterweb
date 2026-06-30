// lib/billing/providers/paypal.ts
import { BillingProviderDriver, UnifiedVerificationResult } from "../types";

class PaypalDriver implements BillingProviderDriver {
  async verifyPayload(payload: any): Promise<UnifiedVerificationResult> {
    // 1. Dapatkan Order ID dari PayPal payload
    const orderId =
      payload.resource?.supplementary_data?.related_ids?.order_id ||
      payload.resource?.billing_agreement_id ||
      payload.resource?.id ||
      payload.orderId; // Fallback untuk direct verify

    if (!orderId) throw new Error("PayPal Order ID tidak ditemukan.");

    // 2. Autentikasi ke PayPal API
    const authRequest = await fetch(
      `${process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com"}/v1/oauth2/token`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(
            `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
          ).toString("base64")}`
        },
        body: "grant_type=client_credentials"
      }
    );
    const { access_token } = await authRequest.json();

    // 3. Ambil detail transaksi resmi dari PayPal
    const orderRequest = await fetch(
      `${process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com"}/v2/checkout/orders/${orderId}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const orderDetails = await orderRequest.json();

    if (orderDetails.status !== "COMPLETED" && orderDetails.status !== "APPROVED") {
      throw new Error("Transaksi PayPal belum diselesaikan.");
    }

    const purchaseUnit = orderDetails.purchase_units?.[0];
    const tenantId = purchaseUnit?.custom_id;
    const description = purchaseUnit?.description || ""; // Format: "PREPAID:pro:monthly"

    if (!tenantId || !description.startsWith("PREPAID:")) {
      throw new Error("Metadata organisasi tidak valid.");
    }

    const [_, planId, billingCycle] = description.split(":");
    const amount = parseFloat(purchaseUnit?.amount?.value || "0");

    // Kembalikan data dalam format standar yang seragam
    return {
      success: true,
      tenantId,
      planId,
      billingCycle: billingCycle as "monthly" | "yearly",
      amount,
      orderId
    };
  }
}

export const paypalDriver = new PaypalDriver();
