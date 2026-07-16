// lib/otp/service.ts
//
// Mesin OTP: issue & verify kode. Server-only (memakai service-role krn otp_codes
// RLS deny client). Code disimpan sbg hash; rate-limit via query otp_codes.

import "server-only";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { OTP_CONFIG, isOtpChannelEnabled, type OtpChannel, type OtpPurpose } from "@/config/otp";
import { getOtpProvider } from "./provider";

const hashCode = (code: string, salt: string) =>
  crypto.createHash("sha256").update(`${code}:${salt}`).digest("hex");

const genCode = (len: number) =>
  String(Math.floor(Math.random() * Math.pow(10, len))).padStart(len, "0");

const genSalt = () => crypto.randomBytes(16).toString("hex");

export interface IssueResult {
  ok: boolean;
  expiresAt?: string;
  error?: string;
  resendAfterSec?: number;
}

/**
 * Issue & kirim OTP. Rate-limit: cooldown antar kirim + cap per jam per target+channel.
 */
export async function issueOtp(
  target: string,
  channel: string,
  purpose: OtpPurpose,
  ip?: string | null
): Promise<IssueResult> {
  if (!isOtpChannelEnabled(channel)) {
    return { ok: false, error: `Channel '${channel}' tidak diaktifkan.` };
  }
  const ch = channel as OtpChannel;
  const targetKey = target.trim().toLowerCase();

  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();

  // Rate-limit: jumlah kirim dalam 1 jam terakhir
  const { count: hourlyCount } = await supabaseAdmin
    .from("otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("target", targetKey)
    .eq("channel", ch)
    .gte("created_at", since(60 * 60 * 1000));

  if ((hourlyCount ?? 0) >= OTP_CONFIG.hourlySendCap) {
    return { ok: false, error: "Terlalu banyak permintaan. Coba lagi nanti." };
  }

  // Cooldown: kirim terakhir
  const { data: last } = await supabaseAdmin
    .from("otp_codes")
    .select("created_at")
    .eq("target", targetKey)
    .eq("channel", ch)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.created_at) {
    const elapsedSec = (now - new Date(last.created_at).getTime()) / 1000;
    if (elapsedSec < OTP_CONFIG.resendCooldownSec) {
      return {
        ok: false,
        error: "Tunggu sebentar sebelum meminta kode baru.",
        resendAfterSec: Math.ceil(OTP_CONFIG.resendCooldownSec - elapsedSec)
      };
    }
  }

  const code = genCode(OTP_CONFIG.codeLength);
  const salt = genSalt();
  const expiresAt = new Date(now + OTP_CONFIG.expiryMinutes * 60 * 1000).toISOString();

  // Simpan kode (hashed)
  const { error: insErr } = await supabaseAdmin.from("otp_codes").insert({
    target: targetKey,
    channel: ch,
    purpose,
    code_hash: hashCode(code, salt),
    code_salt: salt,
    expires_at: expiresAt,
    ip: ip ?? null
  });
  if (insErr) {
    console.error("OTP insert failed:", insErr.message);
    return { ok: false, error: "Gagal menerbitkan kode." };
  }

  // Kirim via provider
  try {
    await getOtpProvider(ch).send({ target: target, code, purpose });
  } catch (e: any) {
    console.error("OTP send failed:", e?.message);
    return { ok: false, error: e?.message || "Gagal mengirim kode." };
  }

  return { ok: true, expiresAt };
}

export interface VerifyResult {
  ok: boolean;
  valid: boolean;
  error?: string;
}

/**
 * Verifikasi kode. Increment attempts bila salah; kunci bila melebihi maxAttempts.
 */
export async function verifyOtp(
  target: string,
  channel: string,
  purpose: OtpPurpose,
  code: string
): Promise<VerifyResult> {
  const targetKey = target.trim().toLowerCase();

  // Ambil kode aktif (unconsumed) terbaru
  const { data: row } = await supabaseAdmin
    .from("otp_codes")
    .select("id, code_hash, code_salt, attempts, expires_at, verified_at")
    .eq("target", targetKey)
    .eq("channel", channel)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return { ok: false, valid: false, error: "Kode tidak ditemukan atau sudah dipakai." };
  }
  if (row.verified_at) {
    return { ok: false, valid: false, error: "Kode sudah dipakai." };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, valid: false, error: "Kode kedaluwarsa. Minta kode baru." };
  }
  if (row.attempts >= OTP_CONFIG.maxAttempts) {
    return { ok: false, valid: false, error: "Terlalu banyak percobaan salah. Minta kode baru." };
  }

  const matches = hashCode(code.trim(), row.code_salt) === row.code_hash;

  if (!matches) {
    await supabaseAdmin
      .from("otp_codes")
      .update({ attempts: (row.attempts ?? 0) + 1 })
      .eq("id", row.id);
    return { ok: true, valid: false, error: "Kode salah." };
  }

  // Sukses: tandai verified & consumed
  const { error: upErr } = await supabaseAdmin
    .from("otp_codes")
    .update({ verified_at: new Date().toISOString(), consumed_at: new Date().toISOString() })
    .eq("id", row.id);
  if (upErr) {
    return { ok: false, valid: false, error: "Gagal memverifikasi." };
  }

  return { ok: true, valid: true };
}

/** Tandai semua kode aktif utk target+channel+purpose sbg consumed (invalidasi). */
export async function consumeActiveOtp(
  target: string,
  channel: string,
  purpose: OtpPurpose
) {
  const targetKey = target.trim().toLowerCase();
  await supabaseAdmin
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("target", targetKey)
    .eq("channel", channel)
    .eq("purpose", purpose)
    .is("consumed_at", null);
}
