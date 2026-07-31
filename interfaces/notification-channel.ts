// interfaces/notification-channel.ts
//
// Adapter terpadu untuk channel notifikasi — cerminan pola
// interfaces/payment-provider.ts. Setiap adapter menormalisasi pengiriman ke
// satu DTO (OutboundNotification) dan mengembalikan DeliveryResult. Menambah
// channel baru (sms, whatsapp, discord, ...) cukup buat adapter baru yang
// mengimplementasi NotificationChannel — alur bisnis tidak berubah.

export type NotificationChannelName = "in_app" | "email" | "push";

export type NotificationSource = "system" | "announcement";

export type DeliveryStatus = "sent" | "delivered" | "failed" | "skipped";

/**
 * Pesan keluar yang sudah siap dikirim: title/body sudah diinterpolasi &
 * dilokalkan. Field `to` (email) opsional — adapter email akan skip bila kosong.
 */
export interface OutboundNotification {
  userId: string;
  /** Alamat email penerima (wajib untuk channel email). */
  to?: string;
  title: string;
  body: string;
  /** Konteks tambahan untuk link / payload push. */
  data?: Record<string, unknown>;
  /** URL tujuan saat notifikasi diklik. */
  link?: string | null;
  category: string;
  locale: string;
  source: NotificationSource;
  sourceRef?: string | null;
  /** Id baris in-app (bila sudah di-insert oleh adapter in_app) — dipakai log. */
  notificationId?: string;
}

export interface DeliveryResult {
  channel: NotificationChannelName;
  status: DeliveryStatus;
  error?: string;
  /** Nama provider (mis. mail provider / "web-push"). */
  provider?: string;
  /** Id eksternal — mis. id baris notifications yang baru di-insert. */
  externalId?: string;
}

export interface NotificationChannel {
  readonly name: NotificationChannelName;
  send(msg: OutboundNotification): Promise<DeliveryResult>;
}
