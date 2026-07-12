// lib/billing/providers/paypal.ts
import { BillingProviderDriver, UnifiedVerificationResult } from "../types";
import { plans } from "@/config/billing";

class PaypalDriver implements BillingProviderDriver {
  async verifyPayload(payload: any): Promise<UnifiedVerificationResult> {
    // Membaca ID Langganan (berawalan I-xxxxxxxxxxxx) dari Webhook atau direct verification
    const subscriptionId = payload.resource?.id || payload.subscriptionId || payload.id;

    if (!subscriptionId) throw new Error("PayPal Subscription ID tidak ditemukan.");

    // 1. Dapatkan Token Akses PayPal
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

    // 2. Ambil detail data langganan langsung dari PayPal Subscriptions API
    const subscriptionRequest = await fetch(
      `${process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com"}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/json"
        }
      }
    );
    const subDetails = await subscriptionRequest.json();

    if (subDetails.status !== "ACTIVE" && subDetails.status !== "APPROVED") {
      throw new Error(`Status langganan PayPal adalah ${subDetails.status}. Diharapkan ACTIVE.`);
    }

    const tenantId = subDetails.custom_id; // ID Organisasi kita
    const paypalPlanId = subDetails.plan_id; // ID Plan dari PayPal

    if (!tenantId) {
      throw new Error("ID Organisasi (custom_id) tidak ditemukan pada transaksi.");
    }

    // 3. Cari plan statis mana yang memiliki paypalPlanId cocok di config/billing.ts
    let matchedPlanId = "free";
    let billingCycle: "monthly" | "yearly" = "monthly";
    let amount = 0;

    for (const p of plans) {
      // Menggunakan asersi as any secara lokal untuk mengakses properti paypalPlanId
      const monthlyPrice = p.prices.monthly as any;
      const yearlyPrice = p.prices.yearly as any;

      if (monthlyPrice.paypalPlanId === paypalPlanId) {
        matchedPlanId = p.id;
        billingCycle = "monthly";
        amount = monthlyPrice.amount;
        break;
      }
      if (yearlyPrice.paypalPlanId === paypalPlanId) {
        matchedPlanId = p.id;
        billingCycle = "yearly";
        amount = yearlyPrice.amount;
        break;
      }
    }

    const nextBillingTime = subDetails.billing_info?.next_billing_time;

    return {
      success: true,
      tenantId,
      planId: matchedPlanId,
      billingCycle,
      amount,
      orderId: subscriptionId,
      nextBillingTime: nextBillingTime ? new Date(nextBillingTime).toISOString() : undefined
    };
  }
}

export const paypalDriver = new PaypalDriver();
