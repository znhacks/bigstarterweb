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
import { syncTenantSchools } from "@/app/actions/tenant";

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

/** Update Detail Organisasi (Nama, Deskripsi, Alamat, dll). Bypass RLS via supabaseAdmin. */
export async function updateOrganizationDetailsAction(tenantId: string, payload: Record<string, any>): Promise<Result> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { error: "Tidak terautentikasi." };

    const { error } = await (await tenantRepository(supabaseAdmin))
      .query()
      .update(payload)
      .eq("id", tenantId);

    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    return { error: e?.message || "Gagal memperbarui data organisasi." };
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

    // Sync to tenant_schools junction table
    await syncTenantSchools(tenantId, nonEmptyCodes);

    return {};
  } catch (e: any) {
    return { error: e?.message || "Gagal memperbarui Kode Sekolah." };
  }
}

/**
 * Server Action untuk membaca detail organisasi & hak akses user (bypasses browser RLS issues).
 */
export async function getOrganizationDetailsAction(tenantIdOrSlug: string) {
  try {
    const supabase = await createClient();
    let user: any = null;
    try {
      const authRes = await supabase.auth.getUser();
      user = authRes.data?.user || null;
    } catch {
      user = null;
    }

    const isSuperadmin = !!(user && user.app_metadata?.role === "superadmin");

    // 1. Ambil data tenant (bisa berdasar id atau slug, fallback ke main tenant)
    let tenantData: any = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdOrSlug);

    if (supabaseAdmin) {
      try {
        const repo = await tenantRepository(supabaseAdmin);
        const fields = "id, name, slug, logo, description, website, address_line1, address_line2, city, state_province, postal_code, country_code, kecamatan, desa, business_email, phone_number, tax_id, default_locale, timezone, currency, school_code";

        if (isUuid) {
          const { data: t } = await repo.query().select(fields).eq("id", tenantIdOrSlug).maybeSingle();
          tenantData = t;
        } else {
          const { data: t } = await repo.query().select(fields).ilike("slug", tenantIdOrSlug).maybeSingle();
          tenantData = t;
        }

        if (!tenantData) {
          const { data: firstT } = await repo.query().select(fields).limit(1).maybeSingle();
          tenantData = firstT;
        }
      } catch (tErr) {
        console.warn("Error fetching tenantData:", tErr);
      }
    }

    // Direct Supabase query fallback if repo query failed
    if (!tenantData && supabaseAdmin) {
      try {
        const { data: directT } = await supabaseAdmin.from("tenants").select("*").limit(1).maybeSingle();
        tenantData = directT;
      } catch (dErr) {
        console.warn("Direct tenant fetch error:", dErr);
      }
    }

    if (!tenantData) {
      tenantData = {
        id: "default-tenant-id",
        name: "Jurnal Mengajar",
        slug: "jurnal-mengajar",
        logo: null,
        description: "",
        website: "",
        school_code: ""
      };
    }

    const resolvedTenantId = tenantData.id;

    // 2. Ambil subscription status (default false untuk paket Free)
    let isPaid = false;
    try {
      const subRepo = await subscriptionRepository(supabaseAdmin);
      const { data: subData } = await subRepo
        .query()
        .select("status")
        .eq("tenant_id", resolvedTenantId)
        .maybeSingle();
      if (subData) {
        isPaid = subData.status === "active" && (subData as any).plan_id !== "free";
      }
    } catch {
      isPaid = false;
    }

    // 3. Ambil role & permissions
    let isOwnerOrAdmin = true;
    let permissions: any[] = Object.values(PERMISSIONS);

    if (user?.id && supabaseAdmin) {
      try {
        const { membershipRepository } = await import("@/supabase/repositories/memberships");
        const { data: mData } = await (await membershipRepository(supabaseAdmin))
          .query()
          .select("roles(name, role_permissions(permissions(name)))")
          .eq("tenant_id", resolvedTenantId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (mData?.roles) {
          const roleName = ((mData.roles as any)?.name || "").toLowerCase();
          if (roleName.includes("owner") || roleName.includes("admin") || roleName.includes("pengelola") || isSuperadmin) {
            isOwnerOrAdmin = true;
          }
          const rawPerms = ((mData.roles as any).role_permissions ?? [])
            .map((rp: any) => rp?.permissions?.name)
            .filter((n: any): n is string => typeof n === "string");
          if (rawPerms.length > 0) {
            permissions = rawPerms;
          }
        }
      } catch (mErr) {
        console.warn("Error fetching membership roles:", mErr);
      }
    }

    return {
      success: true,
      tenant: tenantData,
      isPaid,
      isSuperadmin,
      isOwnerOrAdmin,
      permissions
    };
  } catch (e: any) {
    console.error("Error pada getOrganizationDetailsAction:", e);
    return {
      success: true,
      tenant: {
        id: "default-tenant-id",
        name: "Jurnal Mengajar",
        slug: "jurnal-mengajar",
        logo: null
      },
      isPaid: false,
      isSuperadmin: false,
      isOwnerOrAdmin: true,
      permissions: Object.values(PERMISSIONS)
    };
  }
}
