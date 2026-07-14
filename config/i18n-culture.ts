// /config/i18n-culture.ts

export const LOCALES = ["en", "id", "ar"] as const;
export type LocaleCode = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: LocaleCode = "en";

export type Direction = "ltr" | "rtl";
export type MeasurementSystem = "metric" | "imperial";

export interface LocaleMeta {
  label: string;
  dir: Direction;
  bcp47: string;
  dateFnsLocale: "enUS" | "id" | "ar";
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Minggu, 1 = Senin, 6 = Sabtu
  measurementSystem: MeasurementSystem;
  phoneCountry: string;
  font: string;
}

export const LOCALE_META: Record<LocaleCode, LocaleMeta> = {
  en: {
    label: "English",
    dir: "ltr",
    bcp47: "en-US",
    dateFnsLocale: "enUS",
    weekStartsOn: 0,
    measurementSystem: "imperial",
    phoneCountry: "US",
    font: "inter"
  },
  id: {
    label: "Bahasa Indonesia",
    dir: "ltr",
    bcp47: "id-ID",
    dateFnsLocale: "id",
    weekStartsOn: 1,
    measurementSystem: "metric",
    phoneCountry: "ID",
    font: "inter"
  },
  ar: {
    label: "العربية",
    dir: "rtl",
    bcp47: "ar-SA",
    dateFnsLocale: "ar",
    weekStartsOn: 6,
    measurementSystem: "metric",
    phoneCountry: "SA",
    font: "arabic"
  }
};

export function getLocaleMeta(locale: string | undefined): LocaleMeta {
  return (LOCALE_META as Record<string, LocaleMeta>)[locale ?? ""] ?? LOCALE_META[DEFAULT_LOCALE];
}

export const FONTS = {
  inter: { variable: "--font-inter" },
  arabic: { variable: "--font-arabic" }
} as const;

export const DEFAULT_FONT = "inter";

export function getFontVariable(fontKey: string | undefined): string {
  const key = fontKey && fontKey in FONTS ? fontKey : DEFAULT_FONT;
  return `var(${FONTS[key as keyof typeof FONTS].variable})`;
}

// ---- REGISTRY PROVIDER & CONFIG CURRENCY ----
export const CURRENCY_PROVIDERS = {
  exchangerate_api: "exchangerate_api",
  frankfurter: "frankfurter",
  mock: "mock"
} as const;

export const CURRENCY = {
  base: "IDR",
  display: {
    default: "IDR",
    byLocale: {
      en: "USD",
      id: "IDR",
      ar: "SAR"
    } as Record<string, string>
  },
  // exchangerate-api mendukung IDR sebagai base (Frankfurter tidak), sehingga
  // konversi display IDR->USD/SAR tidak lagi jatuh ke MockCurrencyService.
  activeProvider: CURRENCY_PROVIDERS.exchangerate_api,
  allowedProviders: Object.values(CURRENCY_PROVIDERS)
};

export function getDisplayCurrency(locale: string | undefined): string {
  const l = locale ?? "";
  if (l in CURRENCY.display.byLocale) return CURRENCY.display.byLocale[l];
  return CURRENCY.display.default;
}

// ---- UNITS CONFIGURATION ----
export const UNITS = {
  metric: {
    length: "meter", // base unit meter
    mass: "gram", // base unit gram
    temperature: "celsius"
  },
  imperial: {
    length: "foot", // base unit foot
    mass: "pound", // base unit pound
    temperature: "fahrenheit"
  }
} as const;

// ---- ADDRESS CONFIGURATION ----
export type AddressField = "line1" | "line2" | "city" | "region" | "postalCode" | "country";

export interface AddressFieldConfig {
  order: AddressField[];
  required: AddressField[];
  postalPattern?: string;
  postalPlaceholder?: string;
}

export const ADDRESS: Record<string, AddressFieldConfig> = {
  en: {
    order: ["line1", "line2", "city", "region", "postalCode", "country"],
    required: ["line1", "city", "region", "postalCode", "country"],
    postalPattern: "^\\d{5}(-\\d{4})?$",
    postalPlaceholder: "12345"
  },
  id: {
    order: ["line1", "line2", "city", "region", "postalCode", "country"],
    required: ["line1", "city", "region", "postalCode", "country"],
    postalPattern: "^\\d{5}$",
    postalPlaceholder: "12345"
  },
  ar: {
    order: ["line1", "line2", "city", "region", "postalCode", "country"],
    required: ["line1", "city", "region", "country"],
    postalPattern: "^\\d{5}$",
    postalPlaceholder: "11564"
  }
};

export const DEFAULT_ADDRESS_LOCALE = "en";

export function getAddressConfig(locale: string | undefined): AddressFieldConfig {
  return ADDRESS[locale ?? ""] ?? ADDRESS[DEFAULT_ADDRESS_LOCALE];
}
