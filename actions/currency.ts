// /actions/currency.ts
"use server";

import { CURRENCY } from "@/config/i18n-culture";
import { getCurrencyProvider } from "@/services/currency/registry";
import { CurrencyRates } from "@/services/currency/types";

interface CacheEntry {
  data: CurrencyRates;
  timestamp: number;
}

const currencyCache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 jam

async function fetchRatesWithCache(base: string): Promise<CurrencyRates> {
  const now = Date.now();
  const cached = currencyCache[base];

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const provider = getCurrencyProvider();
  try {
    const freshRates = await provider.getLatestRates(base);
    currencyCache[base] = {
      data: freshRates,
      timestamp: now
    };
    return freshRates;
  } catch (error) {
    // FIX: Gunakan "as string" untuk memperluas tipe kompilasi literal
    if ((CURRENCY.activeProvider as string) !== "mock") {
      console.warn("Mengaktifkan mock provider karena kendala jaringan...");
      const { MockCurrencyService } = await import("@/services/currency/mock-service");
      const mock = new MockCurrencyService();
      const mockRates = await mock.getLatestRates(base);
      return mockRates;
    }
    throw error;
  }
}

export async function convertCurrency(
  amount: number,
  targetCurrency: string
): Promise<{ amount: number; rate: number }> {
  const baseCurrency = CURRENCY.base;

  if (baseCurrency === targetCurrency) {
    return { amount, rate: 1 };
  }

  const rateData = await fetchRatesWithCache(baseCurrency);
  const rate = rateData.rates[targetCurrency];

  if (!rate) {
    console.warn(`Kurs tidak ditemukan untuk target: ${targetCurrency}. Menggunakan nilai 1.`);
    return { amount, rate: 1 };
  }

  return {
    amount: amount * rate,
    rate
  };
}
