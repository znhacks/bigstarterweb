// Tipe baris yang dipakai UI superadmin Notification Center.
// Dipisah dari action.ts (yang "use server") supaya bisa di-impor type-only
// oleh komponen client tanpa menarik modul server ke bundle browser.

export interface SuperadminCategory {
  id: string;
  labelKey: string;
  description: string | null;
  defaultChannels: Record<string, boolean>;
  sortOrder: number;
  isSystem: boolean;
}

export interface SuperadminTemplate {
  id: string;
  category: string;
  title: Record<string, string>;
  body: Record<string, string>;
  channels: string[];
  variables: Record<string, { type: string }> | null;
  link: string | null;
  isEnabled: boolean;
  isSystem: boolean;
  updatedAt: string;
}

export interface SuperadminAnnouncement {
  id: string;
  title: Record<string, string>;
  body: Record<string, string>;
  audience: string;
  channels: string[];
  status: string;
  scheduledFor: string | null;
  sentAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface SuperadminDeliveryLog {
  id: string;
  userId: string;
  userEmail: string | null;
  channel: string;
  category: string | null;
  title: string | null;
  status: string;
  error: string | null;
  provider: string | null;
  source: string;
  sourceRef: string | null;
  createdAt: string;
}

export interface ActionResult<T = unknown> {
  success?: true;
  data?: T;
  error?: string;
}
