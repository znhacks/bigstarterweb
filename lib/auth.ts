// lib/auth.ts
import { createClient } from "@/lib/supabase/server";
import { getActiveTenant } from "@/services/tenant";
import { redirect } from "next/navigation";

/**
 * Mengambil data pengguna aktif secara aman di sisi server.
 * Dapat digunakan di Server Components, Server Actions, dan Route Handlers.
 */
export async function getUser() {
  const supabase = await createClient();
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Mengambil sesi (session) aktif saat ini di sisi server.
 */
export async function getSession() {
  const supabase = await createClient();
  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error || !session) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Memastikan pengguna sudah login di Server Component.
 * Jika belum login, otomatis mengalihkan pengguna ke halaman login.
 *
 * @param redirectTo Rute pengalihan jika tidak terautentikasi.
 * @returns Data user yang terautentikasi.
 */
export async function requireAuth(redirectTo: string = "/login") {
  const user = await getUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
}

/**
 * Fungsi opsional untuk memeriksa peran pengguna (RBAC).
 *
 * @param allowedRoles Daftar peran yang diizinkan (contoh: ['superadmin', 'admin'])
 */
// export async function requireRole(allowedRoles: string[], redirectTo: string = "/") {
//   const user = await requireAuth();

//   const userRole = user.app_metadata?.role || user.user_metadata?.role;
//   const isAllowed = allowedRoles.includes(userRole);

//   if (!isAllowed) {
//     redirect(redirectTo);
//   }

//   return user;
// }
export async function requireRole(
  allowedRoles: ("Owner" | "Admin" | "Member")[],
  tenantSlug: string
) {
  // 1. Pastikan pengguna sudah login terlebih dahulu
  await requireAuth();

  // 2. Ambil data organisasi aktif berdasarkan slug URL
  const activeTenantData = await getActiveTenant(tenantSlug);

  // Jika organisasi tidak valid atau user bukan bagian dari organisasi ini, tendang ke halaman root
  if (!activeTenantData) {
    redirect("/");
  }

  const { role, tenant } = activeTenantData;

  // 3. Periksa apakah peran pengguna diizinkan mengakses halaman ini
  const isAllowed = allowedRoles.includes(role as any);

  if (!isAllowed) {
    // Jika tidak diizinkan, kembalikan secara aman ke beranda organisasi mereka
    redirect(`/${tenantSlug}`);
  }

  // Jika lolos verifikasi, kembalikan data untuk dapat digunakan di halaman web
  return { role, tenant };
}
