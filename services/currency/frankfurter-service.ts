import { ICurrencyRateService, CurrencyRates } from "./types";

export class FrankfurterCurrencyService implements ICurrencyRateService {
  async getLatestRates(base: string): Promise<CurrencyRates> {
    try {
      const response = await fetch(`https://api.frankfurter.app/latest?from=${base}`, {
        next: { revalidate: 3600 }
      });

      if (!response.ok) {
        throw new Error(`Frankfurter API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        base: data.base,
        date: data.date,
        rates: data.rates
      };
    } catch (error) {
      console.error("Gagal mengambil kurs dari Frankfurter API, beralih ke fallback:", error);
      throw error;
    }
  }
}
