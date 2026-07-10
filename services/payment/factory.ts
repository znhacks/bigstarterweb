// services/payment/factory.ts

import { PaymentProvider } from "../../interfaces/payment-provider";
import { plans } from "../../config/billing";

import { MayarAdapter } from "./adapters/mayar";
import { PayPalAdapter } from "./adapters/paypal";
import { PaddleAdapter } from "./adapters/paddle";

export class PaymentFactory {
  /**
   * Mendapatkan instance provider spesifik berdasarkan nama.
   */
  static getProvider(providerName: string): PaymentProvider {
    const formattedName = providerName.toLowerCase().trim();

    switch (formattedName) {
      case "paypal":
        return new PayPalAdapter();

      case "mayar":
        return new MayarAdapter();

      case "paddle":
        return new PaddleAdapter();

      default:
        throw new Error(
          `Payment provider "${providerName}" is defined but not fully implemented yet.`
        );
    }
  }

  /**
   * Mendapatkan daftar provider yang diaktifkan di berkas .env.
   */
  static getEnabledProviders(): string[] {
    const envProviders = process.env.NEXT_PUBLIC_ENABLED_PAYMENT_PROVIDERS;

    if (envProviders) {
      return envProviders.split(",").map((p) => p.trim().toLowerCase());
    }

    // Fallback default jika .env kosong: menggunakan 'mayar' sebagai lokal default
    return ["mayar"];
  }
}
