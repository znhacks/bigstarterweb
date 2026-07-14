// /services/currency/exchangerate-api-service.ts
//
// Provider kurs utama. Memakai exchangerate-api (v6) yang mendukung IDR sebagai base,
// sehingga konversi display IDR -> USD/SAR berfungsi (Frankfurter tidak support IDR base).
// Env: EXCHANGERATE_API_KEY
import { ICurrencyRateService, CurrencyRates } from "./types";

export class ExchangeRateApiCurrencyService implements ICurrencyRateService {
  private apiKey = process.env.EXCHANGERATE_API_KEY;

  async getLatestRates(base: string): Promise<CurrencyRates> {
    if (!this.apiKey) {
      throw new Error("EXCHANGERATE_API_KEY is not configured");
    }

    // Endpoint /latest/{BASE} mengembalikan conversion_rates dari BASE ke semua mata uang.
    const url = `https://v6.exchangerate-api.com/v6/${this.apiKey}/latest/${base.toUpperCase()}`;
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) {
      throw new Error(`exchangerate-api error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data || data.result !== "success" || !data.conversion_rates) {
      throw new Error("Invalid data structure from exchangerate-api");
    }

    return {
      base: data.base_code || base.toUpperCase(),
      date: data.time_last_update_utc
        ? new Date(data.time_last_update_utc).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      rates: data.conversion_rates as Record<string, number>
    };
  }
}
