import type { ICurrencyRateService } from "@/interfaces/currency-rate";

const TTL_MS = 60 * 60 * 1000;

export class CachedRateService implements ICurrencyRateService {
  private cache = new Map<string, { at: number; rates: Record<string, number> }>();

  constructor(private readonly inner: ICurrencyRateService) {}

  async getRates(base: string): Promise<Record<string, number>> {
    const hit = this.cache.get(base);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.rates;
    const rates = await this.inner.getRates(base);
    this.cache.set(base, { at: Date.now(), rates });
    return rates;
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    const rates = await this.getRates(from);
    const rate = rates[to];
    if (rate === undefined) throw new Error(`Kurs ${from}→${to} tidak tersedia.`);
    return amount * rate;
  }
}
