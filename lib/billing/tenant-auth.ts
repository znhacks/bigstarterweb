// lib/billing/tenant-auth.ts
//
// Mencegah IDOR pada route billing user: memastikan user yg terautentikasi
// benar-benar anggota tenant yg dimanipulasi (checkout/cancel/resume/downgrade).

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cek apakah userId adalah anggota tenantId (tabel memberships).
 * Superadmin sistem (is_superadmin) diizinkan bypass bila perlu.
 */
export async function isTenantMember(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<boolean> {
  if (!userId || !tenantId) return false;

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (membership) return true;

  // Fallback: superadmin sistem boleh akses tenant manapun
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", userId)
    .maybeSingle();

  return profile?.is_superadmin === true;
}
