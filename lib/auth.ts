// lib/auth.ts
import { createClient } from "@/lib/supabase/server";
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
      error,
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
      error,
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
export async function requireRole(allowedRoles: string[], redirectTo: string = "/dashboard") {
  const user = await requireAuth();
  
  const userRole = user.app_metadata?.role || user.user_metadata?.role;
  const isAllowed = allowedRoles.includes(userRole);

  if (!isAllowed) {
    redirect(redirectTo);
  }

  return user;
}