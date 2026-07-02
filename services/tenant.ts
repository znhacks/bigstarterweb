import { createClient } from "@/lib/supabase/server";

// 1. Mengambil semua tenant yang dimiliki oleh user yang sedang login
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

  // Melakukan mapping agar struktur datanya lebih mudah dibaca
  return data.map((item: any) => ({
    role: item.role,
    ...item.tenants
  }));
}

// 2. Memvalidasi apakah user memiliki akses ke tenant tertentu berdasarkan slug di URL
export async function getActiveTenant(tenantSlug: string) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

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

  if (error || !data) {
    return null;
  }

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
