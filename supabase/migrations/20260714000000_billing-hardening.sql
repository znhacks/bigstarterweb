-- =====================================================================
-- Billing Hardening Migration (Wave 1)
-- Menerapkan keputusan D1-D4 + RPC redeem_coupon
-- D1: transactions + tax_amount/net_amount/fee_amount (pajak & pemasukan)
-- D2: subscriptions + interval (fix bug pro-rata & hitung ends_at)
-- D3: coupon code case-insensitive unique (mendukung mixed-case/Unicode)
-- M3: RPC redeem_coupon (atomic, idempotent, race-safe)
-- =====================================================================

-- M2 (D2): kolom interval pada subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS interval text;

-- M4 (D1): kolom pajak/fee/net pada transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS tax_amount numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_amount numeric(10, 2) DEFAULT 0;

-- M2 (D3): ganti UNIQUE(code) biasa dgn index fungsional lower(code)
-- agar kode mixed-case/Unicode didukung & tetap unik case-insensitive
ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_lower_uniq
  ON public.coupons (lower(code));

-- =====================================================================
-- M3: RPC redeem_coupon
-- Dipanggil webhook saat payment.succeeded untuk:
--   - re-validasi kedaluwarsa & kuota (dengan FOR UPDATE lock anti-race)
--   - insert coupon_redemptions (UNIQUE(coupon_id,tenant_id) = idempotent)
--   - increment redeemed_count
-- Return: 'redeemed' | 'already_redeemed' | 'quota_full' | 'expired' | 'invalid'
-- =====================================================================
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code text, p_tenant uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_existing uuid;
BEGIN
  IF p_code IS NULL OR p_tenant IS NULL THEN
    RETURN 'invalid';
  END IF;

  -- Kunci baris kupon untuk mencegah race condition antar webhook
  SELECT id, valid_until, max_redemptions, redeemed_count
    INTO v_coupon
  FROM public.coupons
  WHERE lower(code) = lower(p_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;

  -- Validasi kedaluwarsa
  IF v_coupon.valid_until IS NOT NULL AND now() > v_coupon.valid_until THEN
    RETURN 'expired';
  END IF;

  -- Validasi kuota
  IF v_coupon.max_redemptions IS NOT NULL
     AND v_coupon.redeemed_count >= v_coupon.max_redemptions THEN
    RETURN 'quota_full';
  END IF;

  -- Cek apakah tenant sudah pernah menukar (idempotent terhadap replay webhook)
  SELECT id INTO v_existing
  FROM public.coupon_redemptions
  WHERE coupon_id = v_coupon.id AND tenant_id = p_tenant
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN 'already_redeemed';
  END IF;

  -- Catat penebusan; constraint UNIQUE(coupon_id, tenant_id) menjadi pengaman akhir
  BEGIN
    INSERT INTO public.coupon_redemptions (coupon_id, tenant_id)
    VALUES (v_coupon.id, p_tenant);
  EXCEPTION WHEN unique_violation THEN
    RETURN 'already_redeemed';
  END;

  -- Increment penghitung
  UPDATE public.coupons
  SET redeemed_count = redeemed_count + 1
  WHERE id = v_coupon.id;

  RETURN 'redeemed';
END;
$$;

-- Grant execute ke role anon/authenticated/service_role (SECURITY DEFINER berjalan sbg owner)
REVOKE ALL ON FUNCTION public.redeem_coupon(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text, uuid) TO authenticated, service_role;
