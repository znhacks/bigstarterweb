export interface ICurrencyRateService {
  getRates(base: string): Promise<Record<string, number>>;

  convert(amount: number, from: string, to: string): Promise<number>;
}
