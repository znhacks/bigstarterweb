// lib/invite/token-client.ts
//
// Decode token undangan di sisi KLIEN untuk KEPERLUAN TAMPILAN saja.
// TIDAK memverifikasi signature (tidak ada secret di klien). Semua keputusan
// otorisasi/validitas dijalankan server-side via verifyInviteToken
// (lib/invite/token.ts) di dalam server action.
//
// Aman untuk diimpor di komponen klien (tidak memakai modul `crypto`).

export interface InviteTokenPeek {
  i: string;
  e: string;
  o: string;
  r: string;
  x: number;
}

function b64urlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

/** Baca payload token untuk tampilan. Mengembalikan null bila token bukan format yang valid. */
export function peekInviteToken(
  token: string | null | undefined
): InviteTokenPeek | null {
  if (!token) return null;
  const body = token.split(".")[0];
  if (!body) return null;
  try {
    const p = JSON.parse(b64urlDecode(body));
    if (!p || typeof p.o !== "string" || typeof p.e !== "string") return null;
    return p as InviteTokenPeek;
  } catch {
    return null;
  }
}
