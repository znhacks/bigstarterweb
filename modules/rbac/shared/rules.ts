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
 * Aturan assignment role berbasis permission-capability.
 * Pengguna hanya boleh menetapkan role bila seluruh permission
 * yang dibawa role target sudah dimiliki oleh actor.
 */
export function canAssignRole(
  myPermissions: Array<string> | null | undefined,
  targetPermissions: Array<string> | null | undefined
): boolean {
  if (!myPermissions || myPermissions.length === 0) return false;
  if (!targetPermissions || targetPermissions.length === 0) return true;
  return targetPermissions.every((permission) => myPermissions.includes(permission));
}
