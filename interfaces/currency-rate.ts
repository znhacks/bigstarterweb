// interfaces/currency-rate.ts
// Kontrak provider kurs. Implementasi konkret ada di services/currency/*.
// Tambah provider baru = buat class implements interface ini + daftar di
// services/currency/registry.ts + set activeProvider di config/i18n-culture.ts.

export interface ICurrencyRateService {
  /** Peta kurs: { [kodeMataUang]: nilaiTerhadapBase }. */
  getRates(base: string): Promise<Record<string, number>>;
  /** Konversi amount dari `from` ke `to`. */
  convert(amount: number, from: string, to: string): Promise<number>;
}
