// supabase/helper/otp-codes.ts
//
// Helper pengambilan data tabel `otp_codes` (schema public).
// Tabel internal OTP (RLS deny client) — helper ini dipakai layer service-role.
// Kode disimpan sbg hash (code_hash + code_salt); verifikasi hash di luar helper.

import { getClient, type AnySupabaseClient } from "./client";
import { otpCodeRepository } from "@/supabase/repositories/otp-codes";

/** Ambil kode OTP aktif (belum consumed) terbaru untuk target+channel+purpose. */
export async function getActiveOtpCode(
  target: string,
  channel: string,
  purpose: string,
  select = "*",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await otpCodeRepository(supabase);
  return repo
    .query()
    .select(select as "*")
    .eq("target", target)
    .eq("channel", channel)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

/** Ambil record OTP terakhir untuk target+channel (cek cooldown). */
export async function getLastOtp(
  target: string,
  channel: string,
  select = "created_at",
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await otpCodeRepository(supabase);
  return repo
    .query()
    .select(select as "*")
    .eq("target", target)
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

/** Hitung jumlah OTP terkirim ke target+channel sejak timestamp tertentu (rate-limit). */
export async function countOtpSince(
  target: string,
  channel: string,
  sinceISO: string,
  client?: AnySupabaseClient
) {
  const supabase = await getClient(client);
  const repo = await otpCodeRepository(supabase);
  return repo
    .query()
    .select("id", { count: "exact", head: true })
    .eq("target", target)
    .eq("channel", channel)
    .gte("created_at", sinceISO);
}
