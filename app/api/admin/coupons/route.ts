// app/api/admin/coupons/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { profileRepository } from '@/supabase/repositories/profiles';
import { couponRepository } from '@/supabase/repositories/coupons';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * FUNGSI PEMBANTU: Memvalidasi apakah pemanggil adalah Superadmin Sistem (is_superadmin di profiles)
 */
async function validateSuperadmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Unauthorized');

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) throw new Error('Invalid token');

  // Menggunakan kueri is_superadmin dari tabel profiles (System Role) yang sudah teruji sukses
  const { data: profile, error: profileErr } = await (await profileRepository(supabaseAdmin))
    .query()
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile || profile.is_superadmin !== true) {
    throw new Error('Forbidden: Hanya Superadmin yang diizinkan');
  }

  return user;
}

/**
 * 1. GET: Menampilkan seluruh kupon aktif untuk Konsol Admin
 */
export async function GET(req: Request) {
  try {
    await validateSuperadmin(req);

    const { data: coupons, error: couponsErr } = await (await couponRepository(supabaseAdmin))
      .query()
      .select('*')
      .order('created_at', { ascending: false });

    if (couponsErr) throw couponsErr;

    return NextResponse.json({ success: true, coupons });
  } catch (error: any) {
    console.error('Admin Coupons Fetch Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.message === 'Unauthorized' ? 401 : error.message.includes('Hanya Superadmin') ? 403 : 500 });
  }
}

/**
 * 2. POST: Membuat kupon promosi baru (kode disimpan apa adanya — mendukung mixed-case/Unicode;
 *    keunikan case-insensitive dijamin oleh index lower(code))
 */
export async function POST(req: Request) {
  try {
    await validateSuperadmin(req);
    const body = await req.json();

    const { code, discountType, discountValue, validUntil, maxRedemptions } = body;

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json({ error: 'Kode, tipe diskon, dan nilai kupon wajib diisi' }, { status: 400 });
    }

    const formattedCode = code.trim(); // Disimpan apa adanya (mixed-case/Unicode)

    const { error: insertErr } = await (await couponRepository(supabaseAdmin))
      .query()
      .insert({
        code: formattedCode,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        max_redemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
        redeemed_count: 0
      });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({ error: 'Kode kupon tersebut sudah digunakan' }, { status: 400 });
      }
      throw insertErr;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin Coupon Save Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * 3. DELETE: Menghapus kupon dari database
 */
export async function DELETE(req: Request) {
  try {
    await validateSuperadmin(req);
    const { searchParams } = new URL(req.url);
    const couponId = searchParams.get('id');

    if (!couponId) {
      return NextResponse.json({ error: 'ID kupon wajib dikirimkan' }, { status: 400 });
    }

    const { error: deleteErr } = await (await couponRepository(supabaseAdmin))
      .query()
      .delete()
      .eq('id', couponId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin Coupon Delete Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}