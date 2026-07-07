export * from "./permissions";
export * from "./types";

import type { PermissionName } from "./permissions";

/**
 * Cek apakah himpunan permission memuat satu permission tertentu.
 * Pure function — aman dipakai server & client.
 */
export function hasPermission(
  perms: string[] | null | undefined,
  required: PermissionName
): boolean {
  return !!perms && perms.includes(required);
}

/**
 * Cek apakah himpunan permission memuat salah satu dari permission yang
 * diminta (semantics any-of).
 */
export function hasAnyPermission(
  perms: string[] | null | undefined,
  required: PermissionName[]
): boolean {
  if (!perms || required.length === 0) return false;
  return required.some((p) => perms.includes(p));
}

/**
 * Aturan assignment role berbasis hirarki:
 * pengguna hanya boleh menetapkan role dengan level LEBIH RENDAH dari
 * dirinya sendiri (targetHierarchy < myHierarchy). Sehingga:
 *  - Member (10) tidak bisa assign siapa pun.
 *  - Admin  (50) bisa assign Member (10).
 *  - Owner (100) bisa assign Admin (50) & Member (10).
 */
export function canAssignRole(
  myHierarchy: number | null | undefined,
  targetHierarchy: number
): boolean {
  if (myHierarchy == null) return false;
  return targetHierarchy < myHierarchy;
}
