import { getLocaleMeta, UNITS } from "@/config/i18n-culture";
import { formatNumber } from "./format";

export type UnitType = "length" | "mass" | "temperature";

// Rumus Konversi
export const CONVERSIONS = {
  length: {
    // Meter ke Kaki (Foot)
    metricToImperial: (m: number) => m * 3.28084,
    // Kaki ke Meter
    imperialToMetric: (f: number) => f / 3.28084
  },
  mass: {
    // Gram ke Pon (Pound)
    metricToImperial: (g: number) => g * 0.00220462,
    // Pon ke Gram
    imperialToMetric: (p: number) => p / 0.00220462
  },
  temperature: {
    // Celsius ke Fahrenheit
    metricToImperial: (c: number) => (c * 9) / 5 + 32,
    // Fahrenheit ke Celsius
    imperialToMetric: (f: number) => ((f - 32) * 5) / 9
  }
};

/**
 * Format representasi angka unit fisik.
 */
export function formatMeasurement(
  value: number,
  type: UnitType,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  const meta = getLocaleMeta(locale);
  const system = meta.measurementSystem;

  // Ambil unit penamaan berdasarkan standar BCP47
  let unitName = "";
  if (type === "length") {
    unitName = system === "metric" ? "meter" : "foot";
  } else if (type === "mass") {
    unitName = system === "metric" ? "gram" : "pound";
  } else if (type === "temperature") {
    unitName = system === "metric" ? "celsius" : "fahrenheit";
  }

  try {
    return new Intl.NumberFormat(meta.bcp47, {
      style: "unit",
      unit: unitName,
      unitDisplay: "long",
      maximumFractionDigits: 1,
      ...options
    }).format(value);
  } catch {
    const symbol = {
      meter: "m",
      foot: "ft",
      gram: "g",
      pound: "lb",
      celsius: "°C",
      fahrenheit: "°F"
    }[unitName];
    return `${formatNumber(value, locale)} ${symbol}`;
  }
}
