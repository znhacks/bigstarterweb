// lib/mail/dispatcher.ts
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { Resend } from "resend";
import nodemailer from "nodemailer";

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendMailParams) {
  // Membaca jenis provider dari environment secara dinamis
  const provider = process.env.MAIL_PROVIDER || "nodemailer"; // Fallback default ke nodemailer/SMTP
  const senderEmail = process.env.MAIL_SENDER_EMAIL || "onboarding@resend.dev";
  const senderName = process.env.MAIL_SENDER_NAME || "Acme Support";

  console.log(`Mengirim email ke ${to} menggunakan provider: ${provider}`);

  // PROVIDER 1: MAILERSEND
  if (provider === "mailersend") {
    const mailersend = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY || "" });
    const sentFrom = new Sender(senderEmail, senderName);
    const recipients = [new Recipient(to, "Invitee User")];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(html);

    return await mailersend.email.send(emailParams);
  }

  // PROVIDER 2: RESEND
  if (provider === "resend") {
    const resend = new Resend(process.env.RESEND_API_KEY || "");
    return await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to,
      subject,
      html
    });
  }

  // PROVIDER 3: NODEMAILER / SMTP GRATIS (Sangat berguna untuk testing lokal/Mailtrap/Gmail)
  if (provider === "nodemailer") {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.mailtrap.io",
      port: parseInt(process.env.SMTP_PORT || "2525"),
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || ""
      }
    });

    return await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      html
    });
  }

  throw new Error(`Email provider '${provider}' tidak didukung atau belum terkonfigurasi.`);
}
