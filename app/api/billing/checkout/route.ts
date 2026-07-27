import { NextResponse } from "next/server";
import { PaymentFactory } from "@/services/payment/factory";
import { isTenantMember } from "@/lib/billing/tenant-auth";
import { createClient } from "@supabase/supabase-js";
import { planPriceRepository } from "@/supabase/repositories/plan-pices";
import { planRepository } from "@/supabase/repositories/plans";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { couponRepository } from "@/supabase/repositories/coupons";
import { paymentOrderRepository } from "@/supabase/repositories/payment-orders";
import { convertToIdr } from "@/services/exchange-rate";
import { resolveBillingOwner, ownerFilter } from "@/lib/billing/owner";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function convertToIdrSafe(amount: number, fromCurrency: string): Promise<number> {
  try {
    const conv = await convertToIdr(amount, fromCurrency);
    return conv.amountInIdr;
  } catch {
    return amount;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planId, interval, provider, tenantId, successUrl, cancelUrl, couponCode } = body;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const isMember = await isTenantMember(supabaseAdmin, user.id, tenantId);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden: bukan anggota tenant" }, { status: 403 });
    }

    const planPriceRepo = await planPriceRepository(supabaseAdmin);
    const { data: dbTargetPrice, error: targetPriceErr } = await planPriceRepo
      .query()

      .select("amount, plan_id, provider_ids, currency, product_id")
      .eq("plan_id", planId)
      .eq("interval", interval)
      .maybeSingle();

    if (targetPriceErr || !dbTargetPrice) {
      return NextResponse.json(
        { error: `Harga untuk paket ${planId} dengan interval ${interval} tidak ditemukan.` },
        { status: 400 }
      );
    }

    const targetPrice = parseFloat(dbTargetPrice.amount);
    const planCurrency = (dbTargetPrice as any).currency || "IDR";

    const providerPriceId =
      (dbTargetPrice as any).provider_ids?.[provider] || (dbTargetPrice as any).product_id || null;

    const { data: planRow } = await (
      await planRepository(supabaseAdmin)
    )
      .query()
      .select("name")
      .eq("id", planId)
      .maybeSingle();
    const planName = planRow?.name || planId;

    const chargeAmountIdr = await convertToIdrSafe(targetPrice, planCurrency);

    const owner = resolveBillingOwner({ tenantId, userId: user.id });
    if (!owner) {
      return NextResponse.json({ error: "Owner tidak teridentifikasi" }, { status: 400 });
    }
    const { column: ownerCol, value: ownerId } = ownerFilter(owner);

    let credit = 0;
    let oldProviderSubscriptionId: string | null = null;
    const { data: activeSub } = await (
      await subscriptionRepository(supabaseAdmin)
    )
      .query()
      .select("starts_at, ends_at, plan_id, provider, provider_subscription_id, interval")
      .eq(ownerCol, ownerId)
      .eq("status", "active")
      .maybeSingle();

    if (activeSub && activeSub.starts_at && activeSub.ends_at) {
      const now = Date.now();
      const start = new Date(activeSub.starts_at).getTime();
      const end = new Date(activeSub.ends_at).getTime();

      if (now < end) {
        const totalDuration = end - start;
        const remainingTime = end - now;

        const oldInterval = activeSub.interval;
        if (oldInterval) {
          const { data: dbOldPrice } = await planPriceRepo
            .query()
            .select("amount, currency")
            .eq("plan_id", activeSub.plan_id)
            .eq("interval", oldInterval)
            .maybeSingle();

          if (dbOldPrice) {
            const oldOriginalIdr = await convertToIdrSafe(
              parseFloat(dbOldPrice.amount),
              (dbOldPrice as any).currency || "IDR"
            );
            const remainingRatio = remainingTime / totalDuration;
            credit = remainingRatio * oldOriginalIdr;
          }
        }
      }

      if (activeSub.provider_subscription_id) {
        oldProviderSubscriptionId = activeSub.provider_subscription_id;
      }
    }

    let finalChargeIdr = chargeAmountIdr - credit;

    let discountAmount = 0;
    if (couponCode) {
      const formattedCode = couponCode.trim();

      const { data: coupon } = await (
        await couponRepository(supabaseAdmin)
      )
        .query()
        .select("*")
        .ilike("code", formattedCode)
        .maybeSingle();

      if (coupon) {
        const isValidDate = !coupon.valid_until || new Date() < new Date(coupon.valid_until);
        const isValidQuota =
          coupon.max_redemptions === null || coupon.redeemed_count < coupon.max_redemptions;

        if (isValidDate && isValidQuota) {
          if (coupon.discount_type === "percentage") {
            discountAmount = (parseFloat(coupon.discount_value) / 100) * finalChargeIdr;
          } else if (coupon.discount_type === "fixed_amount") {
            discountAmount = parseFloat(coupon.discount_value);
          }
          finalChargeIdr = finalChargeIdr - discountAmount;
        }
      }
    }

    const secureFinalPrice = Math.max(1, parseFloat(finalChargeIdr.toFixed(2)));

    const paymentProvider = PaymentFactory.getProvider(provider);

    if (oldProviderSubscriptionId && activeSub?.provider) {
      try {
        const oldAdapter =
          activeSub.provider === provider
            ? paymentProvider
            : PaymentFactory.getProvider(activeSub.provider);
        await oldAdapter.cancelSubscription(oldProviderSubscriptionId);
      } catch (cancelErr) {
        console.warn(
          `[checkout] Gagal membatalkan subscription lama (${oldProviderSubscriptionId}, provider ${activeSub.provider}):`,
          cancelErr
        );
      }
    }

    const session = await paymentProvider.createCheckoutSession({
      tenantId,
      userId: user.id,
      userEmail: user.email || "",
      planId,
      planName,
      interval,
      baseAmount: chargeAmountIdr,
      currency: "IDR",
      customPrice: secureFinalPrice,
      providerPriceId: providerPriceId || undefined,
      couponCode: couponCode ? couponCode.trim() : undefined,
      successUrl: successUrl || `${req.headers.get("origin")}/dashboard/pricing?success=true`,
      cancelUrl: cancelUrl || `${req.headers.get("origin")}/dashboard/pricing?canceled=true`
    });

    try {
      const orderRepo = await paymentOrderRepository(supabaseAdmin);

      await orderRepo
        .query()
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq(ownerCol, ownerId)
        .eq("plan_id", planId)
        .eq("interval", interval)
        .eq("status", "pending");

      await orderRepo.insert({
        tenant_id: tenantId,
        user_id: user.id,
        plan_id: planId,
        interval,
        provider,
        provider_order_id: session.sessionId || null,
        amount: secureFinalPrice,
        charge_currency: "IDR",
        plan_amount: targetPrice,
        plan_currency: planCurrency,
        amount_in_idr: secureFinalPrice,
        coupon_code: couponCode ? couponCode.trim() : null,
        status: "pending"
      });
    } catch (orderErr: any) {
      console.warn("[checkout] Gagal mencatat payment_orders:", orderErr?.message || orderErr);
    }

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Checkout API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
