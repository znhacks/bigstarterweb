import { ICurrencyRateService, CurrencyRates } from "./types";

export class ExchangeRateApiCurrencyService implements ICurrencyRateService {
  private apiKey = process.env.EXCHANGERATE_API_KEY;

  async getLatestRates(base: string): Promise<CurrencyRates> {
    if (!this.apiKey) {
      throw new Error("EXCHANGERATE_API_KEY is not configured");
    }

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
