// lib/invite/token.ts
//
// Token undangan yang ditandatangani (HMAC-SHA256) — menggantikan Base64 JSON
// tanpa tanda yang sebelumnya dapat di-forging (Critical #5: invite hijack).
//
// Format: base64url(JSON(payload)) + "." + base64url(HMAC(body))
// Payload TIDAK dienkripsi (klien boleh membacanya untuk tampilan), tetapi TIDAK
// bisa diubah tanpa membatalkan signature. Pencocokan email
// (session.email === invitation.email) & validitas dijalankan SERVER-SIDE saat
// accept (lihat app/(guest)/join/actions.ts).
//
// SERVER-ONLY: memakai modul `crypto`. Jangan diimpor dari kode klien
// (untuk tampilan klien, pakai lib/invite/token-client.ts).

import crypto from "crypto";

function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "[invite] BETTER_AUTH_SECRET belum diset — token undangan tidak dapat ditandatangani."
    );
  }
  return secret;
}

export interface InviteTokenPayload {
  /** id baris invitation (otoritatif — di-lookup server-side saat accept) */
  i: string;
  /** email undangan (lowercase) — dicocokkan dengan email sesi saat accept */
  e: string;
  /** nama organisasi (display only) */
  o: string;
  /** nama role (display only) */
  r: string;
  /** kedaluwarsa pada (ms timestamp) */
  x: number;
}

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Tanda tangani payload undangan → token string untuk disematkan di URL join. */
export function signInviteToken(
  invitationId: string,
  email: string,
  orgName: string,
  roleName: string
): string {
  const payload: InviteTokenPayload = {
    i: invitationId,
    e: email.toLowerCase(),
    o: orgName,
    r: roleName,
    x: Date.now() + TTL_MS
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", getSecret()).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

/**
 * Verifikasi token undangan. Mengembalikan payload bila signature valid dan
 * belum kedaluwarsa, atau null bila tidak valid / kesalahan.
 */
export function verifyInviteToken(
  token: string | null | undefined
): InviteTokenPayload | null {
  if (!token) return null;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", secret).update(body).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (provided.length !== expected.length || provided.length === 0) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  let payload: InviteTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
  if (
    !payload ||
    typeof payload.i !== "string" ||
    typeof payload.x !== "number" ||
    typeof payload.e !== "string"
  ) {
    return null;
  }
  if (Date.now() > payload.x) return null; // kedaluwarsa
  return payload;
}
