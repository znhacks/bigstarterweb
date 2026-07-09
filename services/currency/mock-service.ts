// /services/currency/mock-service.ts
import { ICurrencyRateService, CurrencyRates } from "./types";

export class MockCurrencyService implements ICurrencyRateService {
  async getLatestRates(base: string): Promise<CurrencyRates> {
    // Memberikan data kurs statis untuk keperluan testing offline
    const mockRates: Record<string, Record<string, number>> = {
      USD: { IDR: 16000, SAR: 3.75, USD: 1, EUR: 0.92 },
      IDR: { USD: 0.0000625, SAR: 0.000234, IDR: 1, EUR: 0.0000575 },
      SAR: { USD: 0.27, IDR: 4266.67, SAR: 1, EUR: 0.25 }
    };

    return {
      base,
      date: new Date().toISOString().split("T")[0],
      rates: mockRates[base] ?? { USD: 1 }
    };
  }
}
