// services/payment/adapters/midtrans.ts

import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult,
  SubscriptionInterval
} from "../../../interfaces/payment-provider";
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
    // IDR-native one-time charge: diskon/pro-rata langsung diterapkan via customPrice
    const amount = params.customPrice ?? params.baseAmount ?? 0;
    if (!amount) throw new Error("Midtrans: amount tidak boleh 0 (customPrice/baseAmount wajib)");

    // order_id hanya untuk keunikan & tampilan. tenantId/planId/interval/couponCode
    // disimpan penuh di custom_field (bukan di order_id) agar tidak terpotong.
    const orderId = `MID-${Date.now()}-${params.tenantId.substring(0, 8)}`;
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
        },
        // Key pendek agar muat dalam batas 100 char custom_field Midtrans
        custom_field1: JSON.stringify({
          t: params.tenantId,
          p: params.planId,
          i: params.interval
        }),
        custom_field2: params.couponCode ?? ""
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
    // FAIL-CLOSED: server key kosong membuat signature dapat di-forging
    // (signature dihitung atas sha512(... + ""), yang bisa dihitung penyerang).
    if (!this.serverKey) {
      throw new Error(
        "[midtrans] MIDTRANS_SERVER_KEY belum diset — verifikasi signature webhook WAJIB. SET env ini sebelum menerima webhook."
      );
    }

    const payload = await req.json();

    // Verifikasi Signature SHA512 Midtrans + timing-safe compare.
    const signatureSource = `${payload.order_id}${payload.status_code}${payload.gross_amount}${this.serverKey}`;
    const localSignature = crypto.createHash("sha512").update(signatureSource).digest("hex");

    const sigBuf = Buffer.from(payload.signature_key || "", "hex");
    const expBuf = Buffer.from(localSignature, "hex");
    const ok =
      sigBuf.length === expBuf.length &&
      sigBuf.length > 0 &&
      crypto.timingSafeEqual(sigBuf, expBuf);
    if (!ok) {
      throw new Error("Invalid Midtrans signature key");
    }

    // Ambil context penuh dari custom_field (bukan dari order_id yg terpotong)
    let tenantId = "";
    let planId: string | undefined;
    let interval: SubscriptionInterval | undefined;
    let couponCode: string | undefined;

    try {
      const ctx = payload.custom_field1 ? JSON.parse(payload.custom_field1) : {};
      tenantId = ctx.t || "";
      planId = ctx.p;
      interval = ctx.i;
    } catch {
      // custom_field1 bukan JSON valid — biarkan kosong
    }
    if (payload.custom_field2) {
      couponCode = payload.custom_field2 || undefined;
    }

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
      tenantId,
      planId,
      interval,
      couponCode,
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
