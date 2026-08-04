"use server";

// Server action mutasi tenant (schema public) dgn cek permission eksplisit.
// Berbeda dari tasks/actions.ts (pakai createTenantServerClient utk schema tenant),
// tabel tenants ada di schema public → pakai createClient() (server user client, RLS).

import { createClient } from "@/lib/supabase/server";
import { resolveTenantAuthorityFull } from "@/lib/billing/tenant-auth";
import { PERMISSIONS } from "@/modules/rbac/shared";
import { hasPermission } from "@/modules/rbac/shared";
import { tenantRepository } from "@/supabase/repositories/tenants";

type Result = { error?: string };

/** Soft-delete organisasi (status=deleted). Wajib permission organization.delete. */
export async function deleteOrganizationAction(tenantId: string): Promise<Result> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { error: "Tidak terautentikasi." };

    const authority = await resolveTenantAuthorityFull(supabase, user.id, tenantId);
    if (!hasPermission(authority.permissions, PERMISSIONS.organizationDelete)) {
      return { error: "Akses ditolak: butuh permission organization.delete." };
    }

    const { error } = await (await tenantRepository(supabase))
      .query()
      .update({ status: "deleted", deleted_at: new Date().toISOString() })
      .eq("id", tenantId);
    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    return { error: e?.message || "Gagal menghapus organisasi." };
  }
}
