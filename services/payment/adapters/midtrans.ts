// services/payment/adapters/midtrans.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult
} from "../../../interfaces/payment-provider";
import { plans } from "../../../config/billing";
import crypto from "crypto";

export class MidtransAdapter implements PaymentProvider {
  private serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  private isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  private get baseUrl() {
    return this.isProduction
      ? "https://app.midtrans.com/snap/v1"
      : "https://app.sandbox.midtrans.com/snap/v1";
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const selectedPlan = plans.find((p) => p.id === params.planId);
    if (!selectedPlan) throw new Error("Selected plan not found");

    const amount =
      params.interval === "month"
        ? selectedPlan.prices.monthly.amount
        : selectedPlan.prices.yearly.amount;

    const orderId = `MID-${params.tenantId.substring(0, 8)}-${Date.now()}`;
    const authHeader = Buffer.from(`${this.serverKey}:`).toString("base64");

    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: amount
        },
        customer_details: {
          email: params.userEmail
        },
        callbacks: {
          finish: params.successUrl,
          cancel: params.cancelUrl
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Midtrans failed: ${err.error_messages?.[0] || response.statusText}`);
    }

    const data = await response.json();
    return {
      checkoutUrl: data.redirect_url, // URL Snap Midtrans
      sessionId: orderId
    };
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const payload = await req.json();

    // Verifikasi Signature SHA512 Midtrans untuk keamanan tingkat tinggi
    const signatureSource = `${payload.order_id}${payload.status_code}${payload.gross_amount}${this.serverKey}`;
    const localSignature = crypto.createHash("sha512").update(signatureSource).digest("hex");

    if (payload.signature_key !== localSignature) {
      throw new Error("Invalid Midtrans signature key");
    }

    // Ekstraksi tenantId dari struktur penamaan order_id kita (MID-tenantId-timestamp)
    const orderParts = payload.order_id.split("-");
    const tenantPrefix = orderParts[1] || ""; // Mengambil tenantId parsial

    // Pencocokan status pembayaran Midtrans
    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;
    let status = "failed";

    if (transactionStatus === "capture") {
      if (fraudStatus === "challenge") status = "challenge";
      else if (fraudStatus === "accept") status = "paid";
    } else if (transactionStatus === "settlement") {
      status = "paid";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      status = "failed";
    }

    return {
      eventType: status === "paid" ? "payment.succeeded" : "payment.failed",
      tenantId: tenantPrefix, // Mengembalikan ID parsial untuk penanganan DB
      status: status,
      amount: parseFloat(payload.gross_amount),
      currency: "IDR",
      orderId: payload.order_id
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    return true; // Midtrans Snap bersifat one-time charge, return true langsung
  }
}
