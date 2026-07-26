// app/(auth)/(users)/[tenant_slug]/layout.tsx
//
// Gate global app-access: ketika billingConfig.requireActiveSubscription = true, halaman
// di bawah tenant_slug diblokir (paywall) bila tidak ada langganan aktif, kecuali route
// /organization (billing & pengaturan org). Saat false (default) → children dirender apa adanya.

"use client";

import { SubscriptionGuard } from "@/components/subscription-guard";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <SubscriptionGuard>{children}</SubscriptionGuard>;
}
