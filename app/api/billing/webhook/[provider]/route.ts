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

function calculateGatewayFee(amount: number, provider: string, currency: string = "IDR"): number {
  const p = provider.toLowerCase().trim();

  if (p === "stripe") {
    return amount * 0.029 + (currency === "USD" ? 0.3 : 5000);
  }
  if (p === "paypal" || p === "braintree") {
    return amount * 0.034 + (currency === "USD" ? 0.3 : 5000);
  }
  if (p === "paddle" || p === "lemonsqueezy") {
    return amount * 0.05 + (currency === "USD" ? 0.5 : 7500);
  }
  if (p === "midtrans" || p === "xendit" || p === "mayar") {
    return 4000;
  }
  return 0;
}

function computeEndsAt(interval?: string, provided?: string): string | null {
  if (provided) return provided;
  const now = new Date();
  if (interval === "yearly") now.setFullYear(now.getFullYear() + 1);
  else now.setMonth(now.getMonth() + 1);
  return now.toISOString();
}

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
      planId: rawPlanId,
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

    if (!paymentOrder && tenantId && planId) {
      const { data: pending } = await (
        await paymentOrderRepository(supabaseAdmin)
      ).findPendingByContext(providerName, tenantId, planId);
      if (pending) paymentOrder = pending;
    }

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            "Tenant ID tidak ditemukan: tidak ada payment_orders untuk order ini & provider tidak meng-echo context."
        },
        { status: 400 }
      );
    }

    const billOwner = resolveBillingOwner({ tenantId, userId: paymentOrder?.user_id });
    const billCol: "tenant_id" | "user_id" = billOwner
      ? ownerFilter(billOwner).column
      : "tenant_id";
    const billId: string = billOwner ? ownerFilter(billOwner).value : tenantId;

    const normalizedStatus = status.toLowerCase().trim();
    let finalPlanId = planId;

    const subscriptionRepo = await subscriptionRepository(supabaseAdmin);

    if (!finalPlanId && providerSubscriptionId) {
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
          const nm = planRow.name;
          resolvedPlanName = typeof nm === "string" ? nm : getLocalizedValue(nm, "en");
        }
      }

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

      if (finalPlanId) {
        const isRecurringProvider =
          (providerName === "paypal" && providerSubscriptionId?.startsWith("I-")) ||
          (providerName === "stripe" && providerSubscriptionId?.startsWith("sub_")) ||
          (providerName === "paddle" && providerSubscriptionId?.startsWith("sub_"));

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
            cancel_at_period_end: !isRecurringProvider,
            pending_plan_id: null,
            updated_at: new Date().toISOString()
          },
          { onConflict: billCol }
        );

        if (subGrantError) {
          console.error(`[webhook] Grant subscription gagal: ${subGrantError.message}`);
        }
      }

      await redeemCouponIfPresent(couponCode, tenantId);

      if (paymentOrder) {
        await (
          await paymentOrderRepository(supabaseAdmin)
        ).markStatus(paymentOrder.id, "paid", { paid_at: new Date().toISOString() });
      }
    } else if (eventType === "payment.failed") {
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
