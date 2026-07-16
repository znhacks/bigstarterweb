-- profiles.currency: per-user display currency (driven by country at register/onboarding).
-- Memungkinkan currency akurat per negara (JP→JPY, GB→GBP) alih-alih coarse locale-based.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS currency text;
