// config/payment.ts
export const billingConfig = {
  billingAttachedTo: "tenant",
  requireActiveSubscription: false,
  activeProvider: (process.env.NEXT_PUBLIC_ACTIVE_PAYMENT_PROVIDER?.trim().toLowerCase() ||
    process.env.NEXT_PUBLIC_ENABLED_PAYMENT_PROVIDERS?.split(",")[0]?.trim().toLowerCase() ||
    "mayar") as string
};
