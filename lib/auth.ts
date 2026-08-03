// lib/auth.ts
import { createClient } from "@/lib/supabase/server";
import { profileRepository } from "@/supabase/repositories/profiles";
import { getActiveTenant } from "@/services/tenant";
import { redirect, notFound } from "next/navigation";
import type { PermissionName } from "@/modules/rbac/shared/permissions";
import { hasAnyPermission } from "@/modules/rbac/shared";
import { canAccessOrgRoute } from "@/modules/rbac/shared/org-access";
import type { ActiveTenantContext } from "@/modules/rbac/shared/types";

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
  if (!ctx) notFound();

  if (!ctx.permissions.includes(required)) {
    notFound();
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
  if (!ctx) notFound();

  if (!hasAnyPermission(ctx.permissions, required)) {
    notFound();
  }

  return ctx;
}

/**
 * Gate berbasis permission untuk sub-route organisation.
 * Berbeda dari `requirePermission`/`requireAnyPermission` yang berbasis permission:
 * rule di sini membatasi menu/halaman per route lewat `ORG_ROUTE_REQUIRED_PERMISSIONS`.
 *
 * @param segment Salah satu key ORG_ROUTE_REQUIRED_PERMISSIONS.
 * @param tenantSlug Slug organisasi dari URL.
 * @returns Konteks otoritas + tenant aktif, atau notFound() bila ditolak.
 */
export async function requireOrgRoute(
  segment: string,
  tenantSlug: string
): Promise<ActiveTenantContext> {
  await requireAuth();

  const ctx = await getActiveTenant(tenantSlug);
  if (!ctx || !canAccessOrgRoute(segment, ctx.permissions)) {
    notFound();
  }

  return ctx;
}

/**
 * Memastikan profile row ada untuk user (penting utk OAuth/magic-link signup
 * yg tidak membuat profile di sisi client). Idempoten: insert hanya bila belum ada.
 * Pakai service-role (bypass RLS). Dipanggil di auth callback & middleware.
 */
export async function ensureProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown> | null;
}) {
  const { supabaseAdmin } = await import("@/lib/api/supabase-server");

  const profileRepo = await profileRepository(supabaseAdmin);
  const { data: existing } = await profileRepo
    .query()
    .select("id, address_country")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return existing;

  const meta = (user.user_metadata ?? {}) as Record<string, any>;
  const fullName = meta.full_name || meta.name || user.email?.split("@")[0] || "User";

  const { data, error } = await profileRepo
    .query()
    .insert({ id: user.id, full_name: fullName, status: "active" })
    .select("id, address_country")
    .maybeSingle();

  if (error) {
    console.error("ensureProfile insert failed:", error.message);
    return null;
  }
  return data;
}

/**
 * Gate untuk area Superadmin. Jalur ini SENDIRI terpisah dari sistem
 * role/permission membership — superadmin dideteksi lewat auth metadata
 * ATAU kolom `profiles.is_superadmin` (sumber kebenaran yang dipakai
 * fungsi RLS `is_superadmin()`).
 *
 * Catatan keamanan: sebelum helper ini ditambahkan, TIDAK ada gate server
 * untuk `/superadmin/*` — siapa pun bisa me-render halaman superadmin.
 */
export async function requireSuperadmin(redirectTo: string = "/") {
  const user = await requireAuth();

  // Fast path: app_metadata adalah SERVER-ONLY (tidak bisa ditulis client).
  // AMAN sebagai jalan pintas. (Jangan pernah pakai user_metadata di sini —
  // user_metadata BISA ditulis client via supabase.auth.updateUser, sehingga
  // memeriksanya untuk otorisasi = privilege escalation.)
  const appRole = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  if (appRole === "superadmin") return user;

  // Cek otoritatif via profiles.is_superadmin (service role, bypass RLS).
  const { supabaseAdmin } = await import("@/lib/api/supabase-server");
  const profileRepo = await profileRepository(supabaseAdmin);
  const { data: profile } = await profileRepo
    .query()
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_superadmin === true) return user;

  // Non-superadmin mencoba akses halaman superadmin → 404 (sembunyikan keberadaan halaman).
  notFound();
}
