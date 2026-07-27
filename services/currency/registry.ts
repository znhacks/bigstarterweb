import { CURRENCY, CURRENCY_PROVIDERS } from "@/config/i18n-culture";
import { ICurrencyRateService } from "./types";
import { ExchangeRateApiCurrencyService } from "./exchangerate-api-service";
import { FrankfurterCurrencyService } from "./frankfurter-service";
import { MockCurrencyService } from "./mock-service";

export { CURRENCY_PROVIDERS };

const providers: Record<string, ICurrencyRateService> = {
  [CURRENCY_PROVIDERS.exchangerate_api]: new ExchangeRateApiCurrencyService(),
  [CURRENCY_PROVIDERS.frankfurter]: new FrankfurterCurrencyService(),
  [CURRENCY_PROVIDERS.mock]: new MockCurrencyService()
};

export function getCurrencyProvider(): ICurrencyRateService {
  const activeKey = CURRENCY.activeProvider;
  const provider = providers[activeKey];

  if (!provider) {
    console.warn(`Provider "${activeKey}" tidak terdaftar. Menggunakan mock provider.`);
    return providers[CURRENCY_PROVIDERS.mock];
  }

  return provider;
}
