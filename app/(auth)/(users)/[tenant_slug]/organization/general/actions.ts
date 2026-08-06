"use server";

// Server action mutasi tenant (schema public) dgn cek permission eksplisit.
// Berbeda dari tasks/actions.ts (pakai createTenantServerClient utk schema tenant),
// tabel tenants ada di schema public → pakai createClient() (server user client, RLS).

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/api/supabase-server";
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

    const { error } = await (await tenantRepository(supabaseAdmin))
      .query()
      .update({ status: "deleted", deleted_at: new Date().toISOString() })
      .eq("id", tenantId);
    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    return { error: e?.message || "Gagal menghapus organisasi." };
  }
}

import { subscriptionRepository } from "@/supabase/repositories/subscriptions";

/** Update Kode Sekolah (school_code) untuk koneksi Jurnal Mengajar. Wajib permission organization.update. */
export async function updateSchoolCodeAction(tenantId: string, schoolCode: string): Promise<Result> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { error: "Tidak terautentikasi." };

    const authority = await resolveTenantAuthorityFull(supabase, user.id, tenantId);
    if (!hasPermission(authority.permissions, PERMISSIONS.organizationUpdate)) {
      return { error: "Akses ditolak: Anda tidak memiliki izin untuk memperbarui Kode Sekolah." };
    }

    const codes = schoolCode
      .split(",")
      .map((c: string) => c.trim());

    const nonEmptyCodes = codes.filter(Boolean);

    // Cek status berlangganan tenant (free vs paid)
    const subRepo = await subscriptionRepository(supabaseAdmin);
    const { data: subData } = await subRepo
      .query()
      .select("status")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const isPaid = subData?.status === "active" || subData?.status === "trialing";
    const maxAllowed = isPaid ? 3 : 2;

    if (nonEmptyCodes.length > maxAllowed) {
      return {
        error: `Paket ${isPaid ? "Berlangganan" : "Gratis (Free)"} terbatas maksimal ${maxAllowed} sekolah untuk dipantau.`
      };
    }

    const formattedCode = nonEmptyCodes.length === 0 ? "" : codes.join(", ");

    const { error } = await (await tenantRepository(supabaseAdmin))
      .query()
      .update({ school_code: formattedCode })
      .eq("id", tenantId);
    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    return { error: e?.message || "Gagal memperbarui Kode Sekolah." };
  }
}
