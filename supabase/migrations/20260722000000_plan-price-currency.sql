-- Plan price currency: setiap harga plan bisa berbeda mata uang (IDR/USD/SGD/dll).
-- Membuat plans benar-benar international/boilerplate-friendly.
-- Developer/admin buat plan dgn harga dalam mata uang apapun.

ALTER TABLE public.plan_prices
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IDR';
