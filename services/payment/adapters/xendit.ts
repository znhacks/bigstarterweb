import {
  PaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  UnifiedWebhookResult,
  SubscriptionInterval
} from "../../../interfaces/payment-provider";

// Delimiter untuk external_id: aman karena UUID berisi '-' tapi bukan '::'
const EXTERNAL_ID_DELIMITER = "::";
const PREFIX = "XEN";

function encodeExternalId(
  tenantId: string,
  planId: string,
  interval: string,
  couponCode?: string
): string {
  const parts = [PREFIX, tenantId, planId, interval];
  if (couponCode) parts.push(couponCode);
  return parts.join(EXTERNAL_ID_DELIMITER);
}

function decodeExternalId(raw: string): {
  tenantId: string;
  planId?: string;
  interval?: SubscriptionInterval;
  couponCode?: string;
} {
  const parts = (raw || "").split(EXTERNAL_ID_DELIMITER);
  // Pastikan prefix sesuai sebelum melakukan dekode
  if (parts[0] !== PREFIX) {
    return { tenantId: "" };
  }
  return {
    tenantId: parts[1] || "",
    planId: parts[2] || undefined,
    interval: parts[3] as SubscriptionInterval | undefined,
    couponCode: parts[4] || undefined
  };
}

export class XenditAdapter implements PaymentProvider {
  private apiKey = process.env.XENDIT_API_KEY || "";
  private baseUrl = "https://api.xendit.co";

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const amount = params.customPrice ?? params.baseAmount ?? 0;
    if (!amount) {
      throw new Error("Xendit: amount tidak boleh 0 (customPrice/baseAmount wajib)");
    }

    // --- ENCODE METADATA KE DALAM EXTERNAL_ID ---
    const externalId = encodeExternalId(
      params.tenantId,
      params.planId,
      params.interval || "monthly",
      params.couponCode
    );

    const authHeader = Buffer.from(`${this.apiKey}:`).toString("base64");

    const response = await fetch(`${this.baseUrl}/v2/invoices`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        external_id: externalId,
        amount: amount,
        payer_email: params.userEmail,
        description: `Upgrade ke paket ${params.planName ?? params.planId}`,
        success_redirect_url: params.successUrl,
        failure_redirect_url: params.cancelUrl,
        // Metadata dikirim sebagai cadangan log resmi di dashboard Xendit
        metadata: {
          tenantId: params.tenantId,
          planId: params.planId,
          interval: params.interval,
          couponCode: params.couponCode ?? null
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Xendit failed: ${err.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      checkoutUrl: data.invoice_url,
      sessionId: data.id
    };
  }

  async handleWebhook(req: Request): Promise<UnifiedWebhookResult> {
    const payload = await req.json();
    const token = req.headers.get("x-callback-token");
    const callbackToken = process.env.XENDIT_CALLBACK_TOKEN;

    // FAIL-CLOSED: tanpa token env, signature TIDAK dapat diverifikasi (jangan pernah
    // menerima webhook bila env belum diset).
    if (!callbackToken) {
      throw new Error(
        "[xendit] XENDIT_CALLBACK_TOKEN belum diset — verifikasi webhook WAJIB."
      );
    }
    if (token !== callbackToken) {
      throw new Error("Unauthorized Xendit callback token");
    }

    // --- DECODE METADATA ---
    const externalId = payload.external_id || "";
    let tenantId = "";
    let planId: string | undefined;
    let interval: SubscriptionInterval | undefined;
    let couponCode: string | undefined;

    // Lakukan ekstraksi jika external_id diawali dengan prefix buatan kita
    if (externalId.startsWith(`${PREFIX}${EXTERNAL_ID_DELIMITER}`)) {
      const ctx = decodeExternalId(externalId);
      tenantId = ctx.tenantId;
      planId = ctx.planId;
      interval = ctx.interval;
      couponCode = ctx.couponCode;
    } else {
      // Fallback jika ada invoice lama atau manual di luar sistem Next.js
      const metadata = payload.metadata || {};
      tenantId = metadata.tenantId || "";
      planId = metadata.planId;
      interval = metadata.interval;
      couponCode = metadata.couponCode || undefined;
    }

    const status = payload.status === "PAID" ? "paid" : "failed";
    const eventType: UnifiedWebhookResult["eventType"] =
      status === "paid" ? "payment.succeeded" : "payment.failed";

    return {
      eventType,
      tenantId,
      planId,
      interval,
      couponCode,
      status,
      amount: payload.amount,
      currency: payload.currency || "IDR",
      orderId: payload.id,
      // Field di bawah ini diset undefined karena Xendit menggunakan tipe invoice sekali bayar (one-time checkout)
      endsAt: undefined,
      providerSubscriptionId: undefined,
      providerCustomerId: undefined
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    // One-time invoice, pembatalan otomatis dianggap berhasil karena tidak ada siklus berulang di sisi provider
    return true;
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<boolean> {
    // One-time invoice, reaktivasi otomatis dianggap berhasil karena tidak ada siklus berulang di sisi provider
    return true;
  }
}
