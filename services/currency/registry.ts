// /services/currency/registry.ts
import { CURRENCY, CURRENCY_PROVIDERS } from "@/config/i18n-culture";
import { ICurrencyRateService } from "./types";
import { FrankfurterCurrencyService } from "./frankfurter-service";
import { MockCurrencyService } from "./mock-service";

// RE-EKSPOR: Mengekspor kembali CURRENCY_PROVIDERS agar dapat diimpor oleh file lain (seperti ./lib/providers.ts)
export { CURRENCY_PROVIDERS };

const providers: Record<string, ICurrencyRateService> = {
  [CURRENCY_PROVIDERS.frankfurter]: new FrankfurterCurrencyService(),
  [CURRENCY_PROVIDERS.mock]: new MockCurrencyService()
};

/**
 * Mengembalikan instance active provider berdasarkan konfigurasi i18n-culture.ts.
 * Jika provider aktif gagal, sistem otomatis jatuh kembali (fallback) ke MockCurrencyService.
 */
export function getCurrencyProvider(): ICurrencyRateService {
  const activeKey = CURRENCY.activeProvider;
  const provider = providers[activeKey];

  if (!provider) {
    console.warn(`Provider "${activeKey}" tidak terdaftar. Menggunakan mock provider.`);
    return providers[CURRENCY_PROVIDERS.mock];
  }

  return provider;
}
