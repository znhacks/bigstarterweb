// app/(auth)/(users)/[tenant_slug]/layout.tsx
//
// Gate global app-access: ketika billingConfig.requireActiveSubscription = true, halaman
// di bawah tenant_slug diblokir (paywall) bila tidak ada langganan aktif, kecuali route
// /organization (billing & pengaturan org). Saat false (default) → children dirender apa adanya.
// organizations.requireOrganization = true → bila user tanpa org → redirect ke /create-tenant.

"use client";

import { useEffect } from "react";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { supabase } from "@/lib/supabase";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { tenantConfig } from "@/config/tenant";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  // organizations.requireOrganization: bila user tanpa membership → redirect ke create-tenant.
  useEffect(() => {
    if (!tenantConfig.organizations.requireOrganization) return;
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { count } = await (await membershipRepository(supabase))
          .query()
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (!cancelled && count === 0) {
          window.location.href = "/create-tenant";
        }
      } catch {
        // abaikan — SubscriptionGuard tetap jalan
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <SubscriptionGuard>{children}</SubscriptionGuard>;
}
