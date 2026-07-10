// services/exchange-rate.ts

interface ExchangeRateResult {
  convertedAmount: number; // Hasil konversi nominal ke target currency (misal: USD)
  rate: number; // Nilai kurs 1 unit target_currency terhadap IDR (misal: 1 USD = 15800 IDR)
  providerUsed: "frankfurter" | "exchangerate_api" | "hardcoded";
}

// In-Memory Cache untuk menghindari spamming ke API pihak ketiga
interface ExchangeCache {
  rate: number;
  provider: "frankfurter" | "exchangerate_api" | "hardcoded";
  timestamp: number;
}

let rateCache: Record<string, ExchangeCache> = {};

// Ambil durasi TTL dari .env (default: 6 jam)
const CACHE_TTL = process.env.EXCHANGE_RATE_CACHE_TTL
  ? parseInt(process.env.EXCHANGE_RATE_CACHE_TTL)
  : 6 * 60 * 60 * 1000;

// Nilai Kurs Cadangan (Hardcoded) jika semua API down
const HARDCODED_RATE = process.env.HARDCODED_USD_TO_IDR_RATE
  ? parseFloat(process.env.HARDCODED_USD_TO_IDR_RATE)
  : 15800;

/**
 * 1. Ambil Kurs dari Frankfurter API (Primary)
 * Mengambil kurs 1 unit Target Currency (misal: USD) ke IDR
 */
async function fetchFromFrankfurter(targetCurrency: string): Promise<number> {
  const url = `https://api.frankfurter.app/latest?from=${targetCurrency}&to=IDR`;
  const response = await fetch(url, { next: { revalidate: 3600 } }); // Next.js fetch cache (opsional)

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

/**
 * 2. Ambil Kurs dari ExchangeRate-API (Fallback jika Primary gagal)
 */
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

/**
 * Fungsi Utama: Konversi IDR ke Mata Uang Asing secara Real-time
 * @param amountInIdr Nominal uang dalam Rupiah (IDR)
 * @param targetCurrency Mata uang asing tujuan (default: 'USD')
 */
export async function convertIdrToCurrency(
  amountInIdr: number,
  targetCurrency: string = "USD"
): Promise<ExchangeRateResult> {
  const now = Date.now();
  const cacheKey = targetCurrency.toUpperCase();
  const cached = rateCache[cacheKey];

  // A. Gunakan data dari Cache jika masih berlaku (belum kedaluwarsa)
  if (cached && now - cached.timestamp < CACHE_TTL) {
    const convertedAmount = parseFloat((amountInIdr / cached.rate).toFixed(2));
    return {
      convertedAmount,
      rate: cached.rate,
      providerUsed: cached.provider
    };
  }

  // B. Jika cache kosong atau kedaluwarsa, lakukan Fetch ke API

  // Percobaan 1: Coba Frankfurter (Primary)
  try {
    const rate = await fetchFromFrankfurter(targetCurrency);

    // Simpan ke Cache
    rateCache[cacheKey] = { rate, provider: "frankfurter", timestamp: now };

    return {
      convertedAmount: parseFloat((amountInIdr / rate).toFixed(2)),
      rate,
      providerUsed: "frankfurter"
    };
  } catch (error) {
    console.warn("Primary Exchange Rate API (Frankfurter) failed, switching to fallback...", error);
  }

  // Percobaan 2: Coba ExchangeRate-API (Fallback)
  try {
    const rate = await fetchFromExchangeRateApi(targetCurrency);

    // Simpan ke Cache
    rateCache[cacheKey] = { rate, provider: "exchangerate_api", timestamp: now };

    return {
      convertedAmount: parseFloat((amountInIdr / rate).toFixed(2)),
      rate,
      providerUsed: "exchangerate_api"
    };
  } catch (error) {
    console.error("All Exchange Rate APIs failed. Using hardcoded fallback rate.", error);
  }

  // Percobaan 3: Gunakan nilai hardcoded jika seluruh koneksi API gagal
  // Ini adalah pertahanan terakhir agar aplikasi tidak mengalami crash/error 500 saat transaksi
  return {
    convertedAmount: parseFloat((amountInIdr / HARDCODED_RATE).toFixed(2)),
    rate: HARDCODED_RATE,
    providerUsed: "hardcoded"
  };
}
