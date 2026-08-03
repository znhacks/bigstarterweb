// lib/notifications/meta.ts
//
// Registry sisi-client untuk metadata notifikasi (ikon & href tujuan) per
// category / source. Developer fitur baru bisa mendaftarkan meta-nya tanpa
// menyentuh bell/inbox — notifikasi jadi punya ikon & tujuan klik yang relevan.
//
// Pemakaian (di modul client fitur Anda):
//   defineNotificationMeta("invitation", {
//     href: (n) => (n.data?.invitationId ? `/invitations/${n.data.invitationId}` : null)
//   });
//   // atau lebih spesifik: key "source:category" menang sebelum "category".

"use client";

import {
  Bell,
  CreditCard,
  Clock,
  Mail,
  Megaphone,
  Shield,
  Tag,
  User,
  Users,
  type LucideIcon
} from "lucide-react";

export interface NotifItemLite {
  id: string;
  category: string;
  source: string;
  link: string | null;
  data: Record<string, any> | null;
}

export interface NotificationMeta {
  /** Ikon kategori. */
  icon?: LucideIcon;
  /** Bangun href dari notifikasi. Return null/undefined → fallback ke link/detail. */
  href?: (n: NotifItemLite) => string | null;
}

const REGISTRY: Record<string, NotificationMeta> = {};

/** Daftarkan meta. Key bisa "category" atau "source:category" (lebih spesifik menang). */
export function defineNotificationMeta(key: string, meta: NotificationMeta) {
  REGISTRY[key] = meta;
}

/** Lookup meta: coba "source:category" dulu, lalu "category". */
export function getNotificationMeta(category: string, source: string): NotificationMeta {
  return REGISTRY[`${source}:${category}`] ?? REGISTRY[category] ?? {};
}

const DEFAULT_ICONS: Record<string, LucideIcon> = {
  system: Bell,
  payment: CreditCard,
  subscription: CreditCard,
  trial: Clock,
  security: Shield,
  account: User,
  invitation: Mail,
  member: Users,
  announcement: Megaphone,
  marketing: Tag
};

export function notificationIcon(category: string): LucideIcon {
  return DEFAULT_ICONS[category] ?? Bell;
}

/**
 * Prioritas href:
 *   1. registry.href(n)            (builder developer, mis. /invitations/{id})
 *   2. n.link                      (link dinamis yang disimpan saat kirim)
 *   3. /notifications/{n.id}       (halaman detail)
 */
export function resolveNotificationHref(n: NotifItemLite): string {
  const meta = getNotificationMeta(n.category, n.source);
  const metaHref = meta.href?.(n);
  if (metaHref) return metaHref;
  if (n.link) return n.link;
  return `/notifications/${n.id}`;
}
