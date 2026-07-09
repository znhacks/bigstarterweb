// /services/currency/types.ts

export interface CurrencyRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface ICurrencyRateService {
  getLatestRates(base: string): Promise<CurrencyRates>;
}
