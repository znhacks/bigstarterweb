// lib/otp/client.ts
// ganti path sesuai lokasi file aslimu

import { supabase } from "../supabase";

export interface CompleteLoginResult {
  ok: boolean;
  error?: string;
}

export async function completeOtpLogin(tokenHash: string): Promise<CompleteLoginResult> {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink"
  });

  if (error || !data?.session) {
    return { ok: false, error: error?.message || "Gagal membuat sesi." };
  }

  return { ok: true };
}
