// lib/push/client.ts
//
// Helper CLIENT-SIDE untuk Web Push: cek dukungan, minta permission, subscribe
// service worker, dan kirim/hapus subscription ke API. Dipakai oleh UI
// preferences (tombol Enable/Disable push). Tidak ada import server-only.

const SW_PATH = "/sw.js?v=1";
const SUBSCRIBE_ENDPOINT = "/api/notifications/push/subscribe";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export type PushSupportState =
  | NotificationPermission
  | "unsupported";

export function getPushPermission(): PushSupportState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/** Konversi VAPID public key base64url -> Uint8Array untuk applicationServerKey. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(SW_PATH);
}

export interface SubscribeResult {
  ok: boolean;
  error?:
    | "unsupported"
    | "missing-vapid"
    | "permission-denied"
    | "subscribe-failed"
    | string;
}

/** Minta permission + subscribe push + daftarkan ke server. */
export async function subscribePush(): Promise<SubscribeResult> {
  if (!isPushSupported()) return { ok: false, error: "unsupported" };

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { ok: false, error: "missing-vapid" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "permission-denied" };
    }

    const reg = await ensureServiceWorker();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
      });
    }

    const payload = {
      endpoint: sub.endpoint,
      keys: sub.toJSON().keys,
      userAgent: navigator.userAgent
    };
    const res = await fetch(SUBSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return { ok: false, error: "subscribe-failed" };

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

/** Unsubscribe di browser + hapus dari server. */
export async function unsubscribePush(): Promise<{ ok: boolean }> {
  if (!isPushSupported()) return { ok: false };
  try {
    const reg = await ensureServiceWorker();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch(SUBSCRIBE_ENDPOINT, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint })
      });
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
