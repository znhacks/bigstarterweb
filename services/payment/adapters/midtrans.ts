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
    const amount = params.customPrice ?? params.baseAmount ?? 0;
    if (!amount) {
      throw new Error("Midtrans: amount tidak boleh 0 (customPrice/baseAmount wajib)");
    }

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

        custom_field1: JSON.stringify({
          t: params.tenantId,
          p: params.planId,
          i: params.interval
        }),
        custom_field2: params.couponCode ?? ""
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Midtrans failed: ${err.error_messages?.[0] || response.statusText}`);
    }

    const data = await response.json();
    return {
      checkoutUrl: data.redirect_url,
      sessionId: orderId
    };
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    if (!this.serverKey) {
      throw new Error(
        "[midtrans] MIDTRANS_SERVER_KEY belum diset — verifikasi signature webhook WAJIB. SET env ini sebelum menerima webhook."
      );
    }

    const payload = await req.json();

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

    let tenantId = "";
    let planId: string | undefined;
    let interval: SubscriptionInterval | undefined;
    let couponCode: string | undefined;

    try {
      const ctx = payload.custom_field1 ? JSON.parse(payload.custom_field1) : {};
      tenantId = ctx.t || "";
      planId = ctx.p;
      interval = ctx.i;
    } catch {}
    if (payload.custom_field2) {
      couponCode = payload.custom_field2 || undefined;
    }

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

    const eventType: UnifiedWebhookResult["eventType"] =
      status === "paid" ? "payment.succeeded" : "payment.failed";

    return {
      eventType,
      tenantId,
      planId,
      interval,
      couponCode,
      status,
      amount: parseFloat(payload.gross_amount),
      currency: "IDR",
      orderId: payload.order_id,

      endsAt: undefined,
      providerSubscriptionId: undefined,
      providerCustomerId: undefined
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    return true;
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<boolean> {
    return true;
  }
}
