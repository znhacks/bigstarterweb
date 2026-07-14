// app/api/billing/checkout/route.ts

import { NextResponse } from 'next/server';
import { PaymentFactory } from '@/services/payment/factory';
import { createClient } from '@supabase/supabase-js';
import { plans } from '@/config/billing';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planId, interval, provider, tenantId, successUrl, cancelUrl, couponCode } = body;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan) {
      return NextResponse.json({ error: 'Selected plan not found' }, { status: 400 });
    }

    // 1. KALKULASI KREDIT PRO-RATA
    let credit = 0;
    const { data: activeSub } = await supabaseAdmin
      .from('subscriptions')
      .select('starts_at, ends_at, plan_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .maybeSingle();

    if (activeSub && activeSub.starts_at && activeSub.ends_at) {
      const now = Date.now();
      const start = new Date(activeSub.starts_at).getTime();
      const end = new Date(activeSub.ends_at).getTime();

      if (now < end) {
        const totalDuration = end - start;
        const remainingTime = end - now;

        const activePlanConfig = plans.find(p => p.id === activeSub.plan_id);
        if (activePlanConfig) {
          const originalPrice = interval === 'yearly'
            ? activePlanConfig.prices.yearly.amount
            : activePlanConfig.prices.monthly.amount;

          const remainingRatio = remainingTime / totalDuration;
          credit = remainingRatio * originalPrice;
        }
      }
    }

    const targetPrice = interval === 'yearly'
      ? targetPlan.prices.yearly.amount
      : targetPlan.prices.monthly.amount;

    let finalPriceInIdr = targetPrice - credit;

    // 2. INTEGRASI SISTEM KUPON DISKON (VALIDASI SISI SERVER)
    let discountAmount = 0;
    if (couponCode) {
      const formattedCode = couponCode.trim().toUpperCase();
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', formattedCode)
        .maybeSingle();

      if (coupon) {
        // Cek kedaluwarsa & kuota kembali demi keamanan
        const isValidDate = !coupon.valid_until || new Date() < new Date(coupon.valid_until);
        const isValidQuota = coupon.max_redemptions === null || coupon.redeemed_count < coupon.max_redemptions;

        if (isValidDate && isValidQuota) {
          if (coupon.discount_type === 'percentage') {
            discountAmount = (parseFloat(coupon.discount_value) / 100) * finalPriceInIdr;
          } else if (coupon.discount_type === 'fixed_amount') {
            discountAmount = parseFloat(coupon.discount_value);
          }
          finalPriceInIdr = finalPriceInIdr - discountAmount;
        }
      }
    }

    // Pastikan harga tidak minus (minimal Rp 1 / $0.01)
    const secureFinalPrice = Math.max(1, parseFloat(finalPriceInIdr.toFixed(2)));

    // 3. Ambil adapter pembayaran yang sesuai
    const paymentProvider = PaymentFactory.getProvider(provider);

    // 4. Jalankan checkout dengan mengirimkan nominal harga kustom yang sudah dipotong pro-rata + kupon diskon
    const session = await paymentProvider.createCheckoutSession({
      tenantId,
      userId: user.id,
      userEmail: user.email || '',
      planId,
      interval,
      customPrice: secureFinalPrice, // Diskon kupon aman terkirim ke gateway!
      successUrl: successUrl || `${req.headers.get('origin')}/dashboard/billing?success=true`,
      cancelUrl: cancelUrl || `${req.headers.get('origin')}/dashboard/billing?canceled=true`,
    });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error('Checkout API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}