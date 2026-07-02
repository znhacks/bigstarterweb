import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * Mengambil semua tenant/organisasi yang diikuti oleh pengguna saat ini.
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
    .select(
      `
      role,
      tenants (
        id,
        name,
        slug,
        logo
      )
    `
    )
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching user tenants:", error);
    return [];
  }

  return data.map((item: any) => ({
    role: item.role,
    ...item.tenants
  }));
}

/**
 * Mengambil tenant aktif secara fleksibel.
 * Bisa berdasarkan slug URL (jika menggunakan rute dinamis),
 * atau dari Cookie sesi aktif (jika menggunakan rute datar/flat).
 *
 * @param tenantSlug Opsional. Jika diisi, query berdasarkan slug. Jika kosong, gunakan Cookie/Fallback.
 */
export async function getActiveTenant(tenantSlug?: string | null) {
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
      .select(
        `
        role,
        tenants!inner (
          id,
          name,
          slug,
          logo
        )
      `
      )
      .eq("user_id", user.id)
      .eq("tenants.slug", tenantSlug)
      .single();

    if (error || !data) return null;

    return {
      role: data.role,
      tenant: data.tenants as unknown as {
        id: string;
        name: string;
        slug: string;
        logo: string | null;
      }
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
      .select(
        `
        role,
        tenants!inner (
          id,
          name,
          slug,
          logo
        )
      `
      )
      .eq("user_id", user.id)
      .eq("tenant_id", activeTenantId)
      .single();

    if (!error && data) {
      return {
        role: data.role,
        tenant: data.tenants as unknown as {
          id: string;
          name: string;
          slug: string;
          logo: string | null;
        }
      };
    }
  }

  // ==========================================
  // FALLBACK: Jika Cookie kosong, ambil tenant pertama sebagai aktif
  // ==========================================
  const { data: fallbackData, error: fallbackError } = await supabase
    .from("memberships")
    .select(
      `
      role,
      tenants!inner (
        id,
        name,
        slug,
        logo
      )
    `
    )
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (fallbackError || !fallbackData) {
    return null;
  }

  return {
    role: fallbackData.role,
    tenant: fallbackData.tenants as unknown as {
      id: string;
      name: string;
      slug: string;
      logo: string | null;
    }
  };
}
