export const APP_BASE_CURRENCY = "IDR";

export const TAX_RATES: Record<string, number> = {
  ID: 0.11,
  GB: 0.2,
  DE: 0.19,
  FR: 0.2,
  IT: 0.22,
  ES: 0.21,
  NL: 0.21,
  JP: 0.1,
  SG: 0.09,
  AE: 0.05,
  SA: 0.15,
  AU: 0.1,
  NZ: 0.15,
  US: 0,
  CA: 0.05
};

export function getTaxRate(countryCode?: string | null): number {
  if (!countryCode) return 0;
  return TAX_RATES[countryCode.toUpperCase()] ?? 0;
}

export const GATEWAY_FEES: Record<string, { pct: number; fixed: Record<string, number> }> = {
  stripe: { pct: 0.029, fixed: { USD: 0.3, IDR: 5000 } },
  paypal: { pct: 0.034, fixed: { USD: 0.3, IDR: 5000 } },
  braintree: { pct: 0.034, fixed: { USD: 0.3, IDR: 5000 } },
  paddle: { pct: 0.05, fixed: { USD: 0.5, IDR: 7500 } },
  lemonsqueezy: { pct: 0.05, fixed: { USD: 0.5, IDR: 7500 } },
  midtrans: { pct: 0, fixed: { IDR: 4000 } },
  xendit: { pct: 0, fixed: { IDR: 4000 } },
  mayar: { pct: 0, fixed: { IDR: 4000 } }
};

export function calculateGatewayFee(
  amount: number,
  provider: string,
  currency: string = "IDR"
): number {
  const fee = GATEWAY_FEES[provider.toLowerCase().trim()];
  if (!fee) return 0;
  const fixed = fee.fixed[currency] ?? fee.fixed["IDR"] ?? 0;
  return amount * fee.pct + fixed;
}
