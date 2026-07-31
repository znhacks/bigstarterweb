// services/notification/adapters/email.ts
//
// Channel email: membungkus lib/mail/dispatcher.ts sendEmail() yang sudah ada
// (nodemailer/resend/mailersend). Tidak ada infra email baru.

import { sendEmail } from "@/lib/mail/dispatcher";
import type {
  DeliveryResult,
  NotificationChannel,
  OutboundNotification
} from "@/interfaces/notification-channel";

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[c] ?? c
  );
}

function buildHtml(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
    <h2 style="margin:0 0 12px;font-size:18px;">${escapeHtml(title)}</h2>
    <p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(body)}</p>
  </body></html>`;
}

export const emailChannel: NotificationChannel = {
  name: "email",
  async send(msg: OutboundNotification): Promise<DeliveryResult> {
    if (!msg.to) {
      return { channel: "email", status: "skipped", error: "recipient email missing" };
    }
    try {
      await sendEmail({
        to: msg.to,
        subject: msg.title,
        html: buildHtml(msg.title, msg.body)
      });
      return {
        channel: "email",
        status: "sent",
        provider: process.env.MAIL_PROVIDER || "nodemailer"
      };
    } catch (e: any) {
      return {
        channel: "email",
        status: "failed",
        error: e?.message ?? String(e),
        provider: process.env.MAIL_PROVIDER
      };
    }
  }
};
