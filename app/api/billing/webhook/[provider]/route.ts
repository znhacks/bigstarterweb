// app/api/billing/webhook/[provider]/route.ts

import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
import { createClient } from "@supabase/supabase-js";
import { convertToIdr } from "@/services/exchange-rate";
import { planPriceRepository } from "@/supabase/repositories/plan-pices";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { planRepository } from "@/supabase/repositories/plans";
import { transactionRepository } from "@/supabase/repositories/transactions";
import { paymentOrderRepository } from "@/supabase/repositories/payment-orders";
import { resolveBillingOwner, ownerFilter } from "@/lib/billing/owner";
import { getLocalizedValue } from "@/lib/i18n/localize";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * FUNGSI PEMBANTU: Menghitung perkiraan potongan biaya administrasi riil dari ke-8 gateway
 */
function calculateGatewayFee(amount: number, provider: string, currency: string = "IDR"): number {
  const p = provider.toLowerCase().trim();

  if (p === "stripe") {
    return amount * 0.029 + (currency === "USD" ? 0.3 : 5000); // 2.9% + $0.30
  }
  if (p === "paypal" || p === "braintree") {
    return amount * 0.034 + (currency === "USD" ? 0.3 : 5000); // 3.4% + $0.30
  }
  if (p === "paddle" || p === "lemonsqueezy") {
    return amount * 0.05 + (currency === "USD" ? 0.5 : 7500); // 5% + $0.50 (SaaS MoR standard)
  }
  if (p === "midtrans" || p === "xendit" || p === "mayar") {
    return 4000; // Rata-rata flat fee untuk Virtual Account & QRIS lokal Indonesia
  }
  return 0;
}

/** Hitung ends_at default: +1 bulan (monthly) atau +1 tahun (yearly) dari sekarang. */
function computeEndsAt(interval?: string, provided?: string): string | null {
  if (provided) return provided;
  const now = new Date();
  if (interval === "yearly") now.setFullYear(now.getFullYear() + 1);
  else now.setMonth(now.getMonth() + 1);
  return now.toISOString();
}

/** Redeem kupon via RPC (atomic, idempotent). Aman dipanggil di banyak event (subscription.activated & payment.succeeded). */
async function redeemCouponIfPresent(
  couponCode: string | undefined,
  tenantId: string
): Promise<void> {
  if (!couponCode) return;
  try {
    const { data: redeemResult, error: redeemErr } = await supabaseAdmin.rpc("redeem_coupon", {
      p_code: couponCode,
      p_tenant: tenantId
    });
    if (redeemErr) {
      console.error(`[webhook] redeem_coupon error: ${redeemErr.message}`);
    } else if (redeemResult && redeemResult !== "redeemed" && redeemResult !== "already_redeemed") {
      console.warn(`[webhook] Kupon ${couponCode} tidak ter-redeem: ${redeemResult}`);
    }
  } catch (redeemEx) {
    console.error("[webhook] redeem_coupon exception:", redeemEx);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const providerName = provider;

  try {
    const paymentProvider = PaymentFactory.getProvider(providerName);
    const result = await paymentProvider.handleWebhook(req);

    const {
      eventType,
      tenantId: rawTenantId,
      planId: rawPlanId, // ID paket bawaan dari adapter (jika terdeteksi)
      interval: rawInterval,
      couponCode: rawCouponCode,
      startsAt,
      endsAt,
      status,
      providerSubscriptionId,
      providerCustomerId,
      amount,
      currency,
      orderId,
      taxAmount,
      feeAmount
    } = result;

    console.log(
      `========== WEBHOOK [${providerName}] ==========\n` +
        `Event: ${eventType} | Tenant: ${rawTenantId} | Plan: ${rawPlanId} | Status: ${status}\n` +
        `================================================`
    );

    // --- PULIHKAN CONTEXT DARI payment_orders (sumber otoritatif) ---
    // Order dicatat saat checkout; lookup by (provider, provider_order_id) — id yang selalu
    // di-echo provider pada callback. Ini menghilangkan ketergantungan pada echo
    // metadata/external_id (akar bug "Tenant ID not found" pada provider no-ID).
    let paymentOrder: any = null;
    if (orderId) {
      const { data: orderRow } = await (
        await paymentOrderRepository(supabaseAdmin)
      ).findByProviderOrder(providerName, orderId);
      if (orderRow) paymentOrder = orderRow;
    }

    const tenantId = paymentOrder?.tenant_id || rawTenantId;
    const planId = paymentOrder?.plan_id || rawPlanId;
    const interval = paymentOrder?.interval || rawInterval;
    const couponCode = paymentOrder?.coupon_code || rawCouponCode;

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            "Tenant ID tidak ditemukan: tidak ada payment_orders untuk order ini & provider tidak meng-echo context."
        },
        { status: 400 }
      );
    }

    // Scope billing owner (tenant default; user bila config) — dipakai di semua branch.
    const billOwner = resolveBillingOwner({ tenantId, userId: paymentOrder?.user_id });
    const billCol: "tenant_id" | "user_id" = billOwner ? ownerFilter(billOwner).column : "tenant_id";
    const billId: string = billOwner ? ownerFilter(billOwner).value : tenantId;

    const normalizedStatus = status.toLowerCase().trim();
    let finalPlanId = planId;

    const subscriptionRepo = await subscriptionRepository(supabaseAdmin);

    // =========================================================================
    // SINKRONISASI DATABASE DINAMIS (Pencarian JSONB)
    // Jika planId dari adapter kosong, kueri database menggunakan Price ID eksternal
    // =========================================================================
    if (!finalPlanId && providerSubscriptionId) {
      // Cari plan via product_id tunggal (fallback bila payment_orders tak match).
      const { data: priceRecord, error: priceErr } = await (
        await planPriceRepository(supabaseAdmin)
      )
        .query()
        .select("plan_id")
        .eq("product_id", providerSubscriptionId)
        .maybeSingle();

      if (!priceErr && priceRecord) {
        finalPlanId = priceRecord.plan_id;
      }
    }

    if (eventType === "subscription.created" || eventType === "subscription.updated") {
      if (normalizedStatus === "approval_pending" || normalizedStatus === "pending") {
        console.log(
          `[Webhook Ignored] Status masih pending (${normalizedStatus}) untuk tenant: ${tenantId}`
        );
        return NextResponse.json({
          received: true,
          ignored: true,
          reason: "Transaksi belum dibayar (status pending). Database tidak diubah."
        });
      }

      const { error: upsertError } = await subscriptionRepo.query().upsert(
        {
          [billCol]: billId,
          plan_id: finalPlanId || null,
          status: normalizedStatus,
          starts_at: startsAt || new Date().toISOString(),
          ends_at: endsAt || null,
          provider: providerName,
          provider_subscription_id: providerSubscriptionId,
          provider_customer_id: providerCustomerId,
          interval: interval || null,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
          pending_plan_id: null
        },
        { onConflict: billCol }
      );

      if (upsertError) {
        throw new Error(`Database Upsert Subscriptions Failed: ${upsertError.message}`);
      }

      // Redeem kupon juga saat subscription aktif (PayPal ACTIVATED membawa custom_id lebih andal
      // daripada event sale). Idempotent — aman bila juga ter-redeem di payment.succeeded.
      await redeemCouponIfPresent(couponCode, tenantId);
    } else if (eventType === "subscription.deleted") {
      const { data: currentSub, error: fetchError } = await subscriptionRepo
        .query()
        .select("pending_plan_id, provider")
        .eq(billCol, billId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Database Fetch Subscription Failed: ${fetchError.message}`);
      }

      if (currentSub?.pending_plan_id) {
        const { error: downgradeError } = await subscriptionRepo
          .query()
          .update({
            plan_id: currentSub.pending_plan_id,
            status: "active",
            ends_at: null,
            cancel_at_period_end: false,
            pending_plan_id: null,
            updated_at: new Date().toISOString()
          })
          .eq(billCol, billId);

        if (downgradeError) {
          throw new Error(`Database Process Downgrade Failed: ${downgradeError.message}`);
        }
      } else {
        const { error: deleteError } = await subscriptionRepo
          .query()
          .update({
            plan_id: null,
            status: "expired",
            ends_at: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString()
          })
          .eq(billCol, billId);

        if (deleteError) {
          throw new Error(`Database Delete Subscription Failed: ${deleteError.message}`);
        }
      }
    } else if (eventType === "payment.succeeded") {
      const grossAmount = amount || 0;
      const activeCurrency = currency || "IDR";

      // === 1. Hitung pajak, fee, net ===
      const calculatedTax =
        taxAmount !== undefined
          ? taxAmount
          : providerName === "midtrans" || providerName === "xendit" || providerName === "mayar"
            ? grossAmount * 0.11
            : 0;

      const calculatedFee =
        feeAmount !== undefined
          ? feeAmount
          : calculateGatewayFee(grossAmount, providerName, activeCurrency);

      const calculatedNet = Math.max(0, grossAmount - calculatedTax - calculatedFee);

      // === 2. Konversi ke IDR untuk amount_in_idr ===
      let amountInIdr: number | null = grossAmount;
      let exchangeRate: number | null = 1;
      let exchangeApiUsed: string | null = "base";
      try {
        const conv = await convertToIdr(grossAmount, activeCurrency);
        amountInIdr = conv.amountInIdr;
        exchangeRate = conv.rate;
        exchangeApiUsed = conv.providerUsed;
      } catch (convErr) {
        console.warn(`[webhook] Konversi IDR gagal untuk ${activeCurrency}:`, convErr);
        amountInIdr = null;
        exchangeRate = null;
        exchangeApiUsed = null;
      }

      // === 3. Catat transaksi (kolom tax/net/fee kini ada; amount_in_idr/rate/api terisi) ===
      // plan_name: simpan NAMA plan (bukan slug) utk tampilan history.
      let resolvedPlanName = finalPlanId || "unknown";
      if (finalPlanId) {
        const { data: planRow } = await (
          await planRepository(supabaseAdmin)
        )
          .query()
          .select("name")
          .eq("id", finalPlanId)
          .maybeSingle();
        if (planRow?.name) {
          // name bisa objek multibahasa → ambil string bersih utk hindari "[object Object]".
          const nm = planRow.name;
          resolvedPlanName = typeof nm === "string" ? nm : getLocalizedValue(nm, "en");
        }
      }

      // order_id: deterministik agar replay webhook idempotent (jangan pakai Date.now()).
      const resolvedOrderId = orderId || `${providerName}-${providerSubscriptionId || tenantId}`;

      const { error: txError } = await (await transactionRepository(supabaseAdmin)).query().upsert(
        {
          tenant_id: tenantId,
          amount: grossAmount,
          currency: activeCurrency,
          plan_id: finalPlanId || null,
          plan_name: resolvedPlanName,
          order_id: resolvedOrderId,
          status: "paid",
          provider: providerName,
          tax_amount: parseFloat(calculatedTax.toFixed(2)),
          fee_amount: parseFloat(calculatedFee.toFixed(2)),
          net_amount: parseFloat(calculatedNet.toFixed(2)),
          amount_in_idr: amountInIdr !== null ? parseFloat(amountInIdr.toFixed(2)) : null,
          exchange_rate: exchangeRate,
          exchange_api_used: exchangeApiUsed,
          created_at: new Date().toISOString()
        },
        { onConflict: "order_id" }
      );

      if (txError) {
        throw new Error(`Database Insert Transaction Failed: ${txError.message}`);
      }

      // === 4. GRANT SUBSCRIPTION (penting untuk provider invoice mayar/midtrans/xendit
      //      yang tidak memancarkan subscription.created). Hanya grant bila perlu agar
      //      tidak menimpa ends_at provider subscription (paypal/stripe) yg sudah benar. ===
      if (finalPlanId) {
        // Deteksi recurring gateway (PayPal "I-", Stripe/Paddle "sub_").
        const isRecurringProvider =
          (providerName === "paypal" && providerSubscriptionId?.startsWith("I-")) ||
          (providerName === "stripe" && providerSubscriptionId?.startsWith("sub_")) ||
          (providerName === "paddle" && providerSubscriptionId?.startsWith("sub_"));

        // Uang masuk = langganan WAJIB aktif. Selalu upsert (idempotent via onConflict).
        const { error: subGrantError } = await subscriptionRepo.query().upsert(
          {
            [billCol]: billId,
            plan_id: finalPlanId,
            status: "active",
            starts_at: startsAt || new Date().toISOString(),
            ends_at: computeEndsAt(interval, endsAt),
            provider: providerName,
            provider_subscription_id: providerSubscriptionId || orderId || null,
            provider_customer_id: providerCustomerId || null,
            interval: interval || null,
            cancel_at_period_end: !isRecurringProvider, // prepaid (invoice) → true; recurring → false
            pending_plan_id: null,
            updated_at: new Date().toISOString()
          },
          { onConflict: billCol }
        );

        if (subGrantError) {
          console.error(`[webhook] Grant subscription gagal: ${subGrantError.message}`);
        }
      }

      // === 5. REDEEM KUPON (atomic, idempotent via RPC) ===
      await redeemCouponIfPresent(couponCode, tenantId);

      // === 6. UPDATE LIFECYCLE payment_orders → paid ===
      if (paymentOrder) {
        await (
          await paymentOrderRepository(supabaseAdmin)
        ).markStatus(paymentOrder.id, "paid", { paid_at: new Date().toISOString() });
      }
    } else if (eventType === "payment.failed") {
      // Tandai order gagal (lifecycle). Transaksi tidak dicatat; subscription tidak diubah.
      if (paymentOrder) {
        await (await paymentOrderRepository(supabaseAdmin)).markStatus(paymentOrder.id, "failed");
      }
      console.warn(`[webhook] Payment FAILED untuk order ${orderId} (tenant ${tenantId})`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`Webhook Error [${providerName}]:`, error.message || error);
    return NextResponse.json({ error: error.message || "Webhook Handler Error" }, { status: 500 });
  }
}
