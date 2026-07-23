import { createClient } from "@/lib/supabase/server";
import { getMembershipsByUser } from "@/supabase/helper/memberships";
import { cookies } from "next/headers";
import type {
  ActiveTenant,
  ActiveTenantContext,
  ResolvedAuthority
} from "@/lib/rbac/types";
import type { PermissionName } from "@/lib/rbac/permissions";

/**
 * Bentuk baris membership lengkap yang sudah di-join ke roles & tenants.
 * Dipakai internal oleh helper di bawah.
 */
type MembershipRow = {
  role_id: string | null;
  roles:
    | {
        id: string;
        name: string;
        hierarchy_level: number;
        role_permissions: { permissions: { name: string } | null }[] | null;
      }
    | null;
  tenants: ActiveTenant;
};

/**
 * Flatten baris membership (dengan nested roles → role_permissions →
 * permissions) menjadi `ResolvedAuthority`. Aman dipanggil walau role
 * belum ter-assign (role_id NULL) — mengembalikan null.
 *
 * `row` sengaja di-tipen `any` karena gen Supabase menyimpulkan relasi
 * embed (roles/tenants) sebagai array, padahal saat runtime berupa objek
 * (many-to-one). Struktur sebenarnya mengikuti `MembershipRow`.
 */
function resolveAuthority(row: any): ResolvedAuthority | null {
  const role = row.roles;
  if (!role) return null;

  const perms = (role.role_permissions ?? [])
    .map((rp: any) => rp.permissions?.name)
    .filter((n: any): n is string => typeof n === "string") as PermissionName[];

  return {
    roleId: role.id,
    roleName: role.name,
    hierarchyLevel: role.hierarchy_level,
    permissions: perms
  };
}

/** Select string bersama untuk semua query membership di file ini. */
const MEMBERSHIP_SELECT = `
  role_id,
  roles (
    id,
    name,
    hierarchy_level,
    role_permissions ( permissions ( name ) )
  ),
  tenants!inner (
    id,
    name,
    slug,
    logo
  )
`;

/**
 * Mengambil semua tenant/organisasi yang diikuti oleh pengguna saat ini,
 * beserta otoritas (role + permission) di tiap tenant.
 * Digunakan di Halaman Root (/) untuk menentukan rute pengalihan awal.
 */
export async function getUserTenants() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("memberships")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching user tenants:", error);
    return [];
  }

  return (data ?? [])
    .map((item: any) => {
      const authority = resolveAuthority(item as any);
      if (!authority) return null;
      return {
        ...authority,
        tenant: (item as any).tenants
      };
    })
    .filter((t): t is ResolvedAuthority & { tenant: ActiveTenant } => t !== null);
}

/**
 * Mengambil tenant aktif secara fleksibel, sekaligus otoritas (role +
 * permission) pengguna di tenant tersebut.
 *
 * Bisa berdasarkan slug URL (jika menggunakan rute dinamis),
 * atau dari Cookie sesi aktif (jika menggunakan rute datar/flat).
 *
 * @param tenantSlug Opsional. Jika diisi, query berdasarkan slug. Jika kosong, gunakan Cookie/Fallback.
 */
export async function getActiveTenant(
  tenantSlug?: string | null
): Promise<ActiveTenantContext | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  // ==========================================
  // OPSI A: DEVELOPER MENGGUNAKAN SLUG DI URL
  // ==========================================
  if (tenantSlug) {
    const { data, error } = await supabase
      .from("memberships")
      .select(`${MEMBERSHIP_SELECT}`)
      .eq("user_id", user.id)
      .eq("tenants.slug", tenantSlug)
      .single();

    if (error || !data) return null;

    const authority = resolveAuthority(data as any);
    if (!authority) return null;

    return {
      ...authority,
      tenant: (data as any).tenants
    };
  }

  // ==========================================
  // OPSI B: DEVELOPER MENGGUNAKAN FLAT URL (Cookie / Tanpa Slug)
  // ==========================================
  const cookieStore = await cookies();
  const activeTenantId = cookieStore.get("active_tenant_id")?.value;

  if (activeTenantId) {
    // Cari data tenant berdasarkan ID yang disimpan di Cookie
    const { data, error } = await supabase
      .from("memberships")
      .select(`${MEMBERSHIP_SELECT}`)
      .eq("user_id", user.id)
      .eq("tenant_id", activeTenantId)
      .single();

    if (!error && data) {
      const authority = resolveAuthority(data as any);
      if (authority) {
        return {
          ...authority,
          tenant: (data as any).tenants
        };
      }
    }
  }

  // ==========================================
  // FALLBACK: Jika Cookie kosong, ambil tenant pertama sebagai aktif
  // ==========================================
  const { data: fallbackData, error: fallbackError } = await supabase
    .from("memberships")
    .select(`${MEMBERSHIP_SELECT}`)
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (fallbackError || !fallbackData) {
    return null;
  }

  const authority = resolveAuthority(fallbackData as any);
  if (!authority) return null;

  return {
    ...authority,
    tenant: (fallbackData as any).tenants
  };
}
