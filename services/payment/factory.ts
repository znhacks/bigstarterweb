import { PaymentProvider } from "../../interfaces/payment-provider";

import { MayarAdapter } from "./adapters/mayar";
import { PayPalAdapter } from "./adapters/paypal";
import { PaddleAdapter } from "./adapters/paddle";
import { StripeAdapter } from "./adapters/stripe";
import { LemonSqueezyAdapter } from "./adapters/lemonsqueezy";
import { MidtransAdapter } from "./adapters/midtrans";
import { XenditAdapter } from "./adapters/xendit";
import { BraintreeAdapter } from "./adapters/braintree";

export class PaymentFactory {
  static getProvider(providerName: string): PaymentProvider {
    const formattedName = providerName.toLowerCase().trim();

    switch (formattedName) {
      case "stripe":
        return new StripeAdapter();

      case "paypal":
        return new PayPalAdapter();

      case "paddle":
        return new PaddleAdapter();

      case "lemonsqueezy":
        return new LemonSqueezyAdapter();

      case "midtrans":
        return new MidtransAdapter();

      case "xendit":
        return new XenditAdapter();

      case "mayar":
        return new MayarAdapter();

      case "braintree":
        return new BraintreeAdapter();

      default:
        throw new Error(
          `Payment provider "${providerName}" is not supported or not fully implemented.`
        );
    }
  }

  static getEnabledProviders(): string[] {
    const envProviders = process.env.NEXT_PUBLIC_ENABLED_PAYMENT_PROVIDERS;

    const list = envProviders
      ? envProviders.split(",").map((p) => p.trim().toLowerCase())
      : ["mayar"];

    return list.filter((p) => {
      if (p === "braintree") {
        console.warn(
          "[factory] 'braintree' diabaikan dari enabled providers: adapter belum diimplementasikan."
        );
        return false;
      }
      return true;
    });
  }
}
