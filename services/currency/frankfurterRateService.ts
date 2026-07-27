import type { ICurrencyRateService } from "@/interfaces/currency-rate";

const ENDPOINT = "https://api.frankfurter.dev/v1/latest";

export class FrankfurterRateService implements ICurrencyRateService {
  async getRates(base: string): Promise<Record<string, number>> {
    const url = `${ENDPOINT}?base=${encodeURIComponent(base)}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Frankfurter ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { base: string; rates: Record<string, number> };
    return { [base]: 1, ...(json.rates || {}) };
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    const rates = await this.getRates(from);
    const rate = rates[to];
    if (rate === undefined) throw new Error(`Kurs ${from}→${to} tidak tersedia di Frankfurter.`);
    return amount * rate;
  }
}
