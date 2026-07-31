"use client";

import { SubscriptionGuard } from "@/components/subscription-guard";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <SubscriptionGuard>{children}</SubscriptionGuard>;
}
