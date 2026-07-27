interface ExchangeRateResult {
  convertedAmount: number;
  rate: number;
  providerUsed: "frankfurter" | "exchangerate_api" | "hardcoded";
}

interface ExchangeCache {
  rate: number;
  provider: "frankfurter" | "exchangerate_api" | "hardcoded";
  timestamp: number;
}

let rateCache: Record<string, ExchangeCache> = {};

const CACHE_TTL = process.env.EXCHANGE_RATE_CACHE_TTL
  ? parseInt(process.env.EXCHANGE_RATE_CACHE_TTL)
  : 6 * 60 * 60 * 1000;

const HARDCODED_RATE = process.env.HARDCODED_USD_TO_IDR_RATE
  ? parseFloat(process.env.HARDCODED_USD_TO_IDR_RATE)
  : 15800;

async function fetchFromFrankfurter(targetCurrency: string): Promise<number> {
  const url = `https://api.frankfurter.app/latest?from=${targetCurrency}&to=IDR`;
  const response = await fetch(url, { next: { revalidate: 3600 } });

  if (!response.ok) {
    throw new Error("Frankfurter API failed");
  }

  const data = await response.json();
  const rate = data.rates?.IDR;

  if (!rate) {
    throw new Error("Invalid data structure from Frankfurter");
  }

  return rate;
}

async function fetchFromExchangeRateApi(targetCurrency: string): Promise<number> {
  const apiKey = process.env.EXCHANGERATE_API_KEY;
  if (!apiKey) {
    throw new Error("ExchangeRate-API key is not configured");
  }

  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${targetCurrency}/IDR`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("ExchangeRate-API failed");
  }

  const data = await response.json();
  const rate = data.conversion_rate;

  if (!rate) {
    throw new Error("Invalid data structure from ExchangeRate-API");
  }

  return rate;
}

export async function convertIdrToCurrency(
  amountInIdr: number,
  targetCurrency: string = "USD"
): Promise<ExchangeRateResult> {
  const now = Date.now();
  const cacheKey = targetCurrency.toUpperCase();
  const cached = rateCache[cacheKey];

  if (cached && now - cached.timestamp < CACHE_TTL) {
    const convertedAmount = parseFloat((amountInIdr / cached.rate).toFixed(2));
    return {
      convertedAmount,
      rate: cached.rate,
      providerUsed: cached.provider
    };
  }

  try {
    const rate = await fetchFromFrankfurter(targetCurrency);

    rateCache[cacheKey] = { rate, provider: "frankfurter", timestamp: now };

    return {
      convertedAmount: parseFloat((amountInIdr / rate).toFixed(2)),
      rate,
      providerUsed: "frankfurter"
    };
  } catch (error) {
    console.warn("Primary Exchange Rate API (Frankfurter) failed, switching to fallback...", error);
  }

  try {
    const rate = await fetchFromExchangeRateApi(targetCurrency);

    rateCache[cacheKey] = { rate, provider: "exchangerate_api", timestamp: now };

    return {
      convertedAmount: parseFloat((amountInIdr / rate).toFixed(2)),
      rate,
      providerUsed: "exchangerate_api"
    };
  } catch (error) {
    console.error("All Exchange Rate APIs failed. Using hardcoded fallback rate.", error);
  }

  return {
    convertedAmount: parseFloat((amountInIdr / HARDCODED_RATE).toFixed(2)),
    rate: HARDCODED_RATE,
    providerUsed: "hardcoded"
  };
}

export async function convertToIdr(
  amount: number,
  fromCurrency: string
): Promise<{ amountInIdr: number; rate: number; providerUsed: string }> {
  const cur = (fromCurrency || "IDR").toUpperCase();
  if (cur === "IDR") {
    return { amountInIdr: amount, rate: 1, providerUsed: "base" };
  }

  const { rate, providerUsed } = await convertIdrToCurrency(1, cur);
  return {
    amountInIdr: parseFloat((amount * rate).toFixed(2)),
    rate,
    providerUsed
  };
}
