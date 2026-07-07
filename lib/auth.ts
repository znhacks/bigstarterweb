// lib/auth.ts
import { createClient } from "@/lib/supabase/server";
import { getActiveTenant } from "@/services/tenant";
import { redirect } from "next/navigation";
import type { PermissionName } from "@/lib/rbac/permissions";
import { hasAnyPermission } from "@/lib/rbac";
import type { ActiveTenantContext } from "@/lib/rbac/types";

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
 * Memastikan pengguna memiliki permission tertentu di organisasi aktif
 * (RBAC berbasis permission). Otoritas di-resolve dari membership aktif:
 * memberships.role_id → roles → role_permissions → permissions.
 *
 * @param required Permission yang wajib dimiliki.
 * @param tenantSlug Slug organisasi dari URL (untuk pengalihan jika ditolak).
 * @returns Konteks otoritas + tenant aktif.
 */
export async function requirePermission(
  required: PermissionName,
  tenantSlug: string
): Promise<ActiveTenantContext> {
  await requireAuth();

  const ctx = await getActiveTenant(tenantSlug);
  if (!ctx) redirect("/");

  if (!ctx.permissions.includes(required)) {
    redirect(`/${tenantSlug}`);
  }

  return ctx;
}

/**
 * Sama seperti `requirePermission` tapi menerima banyak permission dengan
 * semantik any-of (cukup punya salah satunya).
 */
export async function requireAnyPermission(
  required: PermissionName[],
  tenantSlug: string
): Promise<ActiveTenantContext> {
  await requireAuth();

  const ctx = await getActiveTenant(tenantSlug);
  if (!ctx) redirect("/");

  if (!hasAnyPermission(ctx.permissions, required)) {
    redirect(`/${tenantSlug}`);
  }

  return ctx;
}

/**
 * Gate untuk area Superadmin. Jalur ini SENDIRI terpisah dari sistem
 * role/permission membership — superadmin dideteksi lewat auth metadata
 * (`app_metadata.role === "superadmin"`), bukan lewat tabel roles.
 *
 * Catatan keamanan: sebelum helper ini ditambahkan, TIDAK ada gate server
 * untuk `/superadmin/*` — siapa pun bisa me-render halaman superadmin.
 */
export async function requireSuperadmin(redirectTo: string = "/dashboard") {
  const user = await requireAuth();

  const isSuperadmin =
    (user.app_metadata as Record<string, unknown> | undefined)?.role ===
      "superadmin" ||
    (user.user_metadata as Record<string, unknown> | undefined)?.role ===
      "superadmin" ||
    user.email === "superadmin@example.com"; // legacy demo escape hatch

  if (!isSuperadmin) {
    redirect(redirectTo);
  }

  return user;
}
