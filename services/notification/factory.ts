// services/notification/factory.ts
//
// Registry/dispatcher channel — cerminan services/payment/factory.ts.
// Tambah channel baru (sms/whatsapp/...) = tambah case + adapter.

import type {
  NotificationChannel,
  NotificationChannelName
} from "@/interfaces/notification-channel";
import { inAppChannel } from "./adapters/inapp";
import { emailChannel } from "./adapters/email";
import { pushChannel } from "./adapters/push";

export class NotificationFactory {
  static getChannel(name: NotificationChannelName): NotificationChannel {
    switch (name) {
      case "in_app":
        return inAppChannel;
      case "email":
        return emailChannel;
      case "push":
        return pushChannel;
      default:
        throw new Error(`Notification channel "${name}" is not supported.`);
    }
  }
}
