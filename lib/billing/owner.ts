// lib/billing/owner.ts
//
// Resolver "siapa pemilik langganan" sesuai config billingAttachedTo.
// Mode "tenant" (default) = behavior lama (subscription per tenant).
// Mode "user" = subscription di-scope per user (satu langganan lintas tenant).

import { billingConfig } from "@/config/payment";

export type BillingOwnerType = "tenant" | "user";

export interface BillingOwner {
  type: BillingOwnerType;
  id: string;
}

/**
 * Tentukan owner billing dari konteks request. Mengembalikan null bila key untuk
 * mode aktif tidak tersedia (mis. mode "user" tanpa userId).
 */
export function resolveBillingOwner(ctx: {
  tenantId?: string | null;
  userId?: string | null;
}): BillingOwner | null {
  if (billingConfig.billingAttachedTo === "user") {
    return ctx.userId ? { type: "user", id: ctx.userId } : null;
  }
  return ctx.tenantId ? { type: "tenant", id: ctx.tenantId } : null;
}

/** Nama kolom & nilai untuk memfilter tabel subscriptions sesuai scope aktif. */
export function ownerFilter(
  owner: BillingOwner
): { column: "tenant_id" | "user_id"; value: string } {
  return owner.type === "user"
    ? { column: "user_id", value: owner.id }
    : { column: "tenant_id", value: owner.id };
}
