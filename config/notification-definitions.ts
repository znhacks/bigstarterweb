// config/notification-definitions.ts
//
// Metadata statis (label i18n, urutan, default) untuk channel & kategori.
// Cerminan config/feature-definitions.ts. Nilai default channel di sini hanya
// fallback; nilai runtime yang otoritatif ada di tabel notification_categories
// (default_channels) + notification_preferences (per user), keduanya bisa
// diubah superadmin/user. Daftar template sistem di-seed via migrasi SQL.

import type { NotificationChannelName } from "@/interfaces/notification-channel";

export const NOTIFICATION_CHANNEL_KEYS: NotificationChannelName[] = [
  "in_app",
  "email",
  "push"
];

export interface NotificationChannelMeta {
  key: NotificationChannelName;
  /** i18n key di namespace `notifications.channel.*`. */
  labelKey: string;
  /** Butuh konfigurasi env (email/push) — nonaktif otomatis bila belum di-set. */
  needsConfig?: boolean;
}

export const NOTIFICATION_CHANNELS: NotificationChannelMeta[] = [
  { key: "in_app", labelKey: "notifications.channel.in_app" },
  { key: "email", labelKey: "notifications.channel.email", needsConfig: true },
  { key: "push", labelKey: "notifications.channel.push", needsConfig: true }
];

export interface NotificationCategoryMeta {
  id: string;
  /** i18n key di namespace `notifications.category.*`. */
  labelKey: string;
  description?: string;
  sort: number;
  /** Default channel (fallback) saat kategori belum ada di DB. */
  defaultChannels: Record<NotificationChannelName, boolean>;
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryMeta[] = [
  {
    id: "system",
    labelKey: "notifications.category.system",
    description: "System & app-level alerts",
    sort: 0,
    defaultChannels: { in_app: true, email: true, push: false }
  },
  {
    id: "payment",
    labelKey: "notifications.category.payment",
    description: "Payment events",
    sort: 10,
    defaultChannels: { in_app: true, email: true, push: false }
  },
  {
    id: "subscription",
    labelKey: "notifications.category.subscription",
    description: "Subscription lifecycle",
    sort: 20,
    defaultChannels: { in_app: true, email: true, push: false }
  },
  {
    id: "trial",
    labelKey: "notifications.category.trial",
    description: "Trial reminders",
    sort: 30,
    defaultChannels: { in_app: true, email: true, push: false }
  },
  {
    id: "security",
    labelKey: "notifications.category.security",
    description: "Security & account access",
    sort: 40,
    defaultChannels: { in_app: true, email: true, push: true }
  },
  {
    id: "account",
    labelKey: "notifications.category.account",
    description: "Account changes",
    sort: 50,
    defaultChannels: { in_app: true, email: true, push: false }
  },
  {
    id: "invitation",
    labelKey: "notifications.category.invitation",
    description: "Tenant invitations",
    sort: 60,
    defaultChannels: { in_app: true, email: true, push: false }
  },
  {
    id: "member",
    labelKey: "notifications.category.member",
    description: "Membership changes",
    sort: 70,
    defaultChannels: { in_app: true, email: true, push: false }
  },
  {
    id: "announcement",
    labelKey: "notifications.category.announcement",
    description: "Admin announcements",
    sort: 80,
    defaultChannels: { in_app: true, email: true, push: false }
  },
  {
    id: "marketing",
    labelKey: "notifications.category.marketing",
    description: "Marketing & promotional",
    sort: 90,
    defaultChannels: { in_app: false, email: true, push: false }
  }
];

/** Helper: dapatkan metadata channel by key. */
export function getChannelMeta(key: NotificationChannelName) {
  return NOTIFICATION_CHANNELS.find((c) => c.key === key);
}

/** Helper: dapatkan metadata kategori by id (fallback aman). */
export function getCategoryMeta(id: string): NotificationCategoryMeta | undefined {
  return NOTIFICATION_CATEGORIES.find((c) => c.id === id);
}
