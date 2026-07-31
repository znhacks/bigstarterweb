// services/notification/preferences.ts
//
// Resolver preferensi efektif per user: DEFAULT_PREFERENCES (config)
//   ← default_channels (tabel notification_categories, bisa diubah superadmin)
//   ← preferences (tabel notification_preferences, per user).
// Cache in-memory 5 menit + invalidate-on-write — cerminan disiplin cache
// services/payment/billing/gating.ts.

import { supabaseAdmin } from "@/lib/api/supabase-server";
import { notificationCategoryRepository } from "@/supabase/repositories/notification-categories";
import { notificationPreferenceRepository } from "@/supabase/repositories/notification-preferences";
import { DEFAULT_PREFERENCES } from "@/config/notification";
import { NOTIFICATION_CATEGORIES } from "@/config/notification-definitions";
import type { NotificationChannelName } from "@/interfaces/notification-channel";

type ChannelMap = Record<NotificationChannelName, boolean>;
type PrefMap = Record<string, ChannelMap>;

const FALLBACK: ChannelMap = { in_app: true, email: true, push: false };
const TTL = 5 * 60 * 1000;

const userCache = new Map<string, { ts: number; prefs: PrefMap }>();
let categoryDefaultsCache: { ts: number; data: PrefMap } | null = null;

/** Invalidate cache preferensi (panggil setelah mutasi preferensi user/kategori). */
export function invalidatePreferencesCache(userId?: string) {
  if (userId) userCache.delete(userId);
  else userCache.clear();
  categoryDefaultsCache = null;
}

async function getCategoryDefaults(): Promise<PrefMap> {
  if (categoryDefaultsCache && Date.now() - categoryDefaultsCache.ts < TTL) {
    return categoryDefaultsCache.data;
  }
  const repo = await notificationCategoryRepository(supabaseAdmin);
  const { data } = await repo.query().select("id, default_channels");
  const map: PrefMap = {};
  for (const c of data ?? []) {
    map[c.id] = normalize(c.default_channels);
  }
  for (const cat of NOTIFICATION_CATEGORIES) {
    if (!map[cat.id]) map[cat.id] = { ...cat.defaultChannels };
  }
  categoryDefaultsCache = { ts: Date.now(), data: map };
  return map;
}

async function getUserPreferences(userId: string): Promise<PrefMap> {
  const repo = await notificationPreferenceRepository(supabaseAdmin);
  const { data } = await repo
    .query()
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();
  const prefs = (data?.preferences ?? {}) as PrefMap;
  const out: PrefMap = {};
  for (const [cat, chans] of Object.entries(prefs)) {
    out[cat] = normalize(chans);
  }
  return out;
}

function normalize(chans: any): ChannelMap {
  if (!chans || typeof chans !== "object") return { ...FALLBACK };
  return {
    in_app: chans.in_app !== false,
    email: chans.email !== false,
    push: chans.push === true
  };
}

/** Preferensi efektif user (merge config ← kategori ← user). */
export async function getEffectivePreferences(
  userId: string
): Promise<PrefMap> {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.ts < TTL) return cached.prefs;

  const [categoryDefaults, userPrefs] = await Promise.all([
    getCategoryDefaults(),
    getUserPreferences(userId)
  ]);

  const merged: PrefMap = {};
  for (const cat of NOTIFICATION_CATEGORIES) {
    merged[cat.id] = {
      ...FALLBACK,
      ...DEFAULT_PREFERENCES[cat.id],
      ...(categoryDefaults[cat.id] ?? {}),
      ...(userPrefs[cat.id] ?? {})
    };
  }
  // kategori ekstra yang dipunyai user tapi tidak ada di config
  for (const cat of Object.keys(userPrefs)) {
    if (!merged[cat]) merged[cat] = { ...FALLBACK, ...userPrefs[cat] };
  }

  userCache.set(userId, { ts: Date.now(), prefs: merged });
  return merged;
}

/** Cek cepat apakah sebuah channel aktif untuk kategori tertentu. */
export async function isChannelEnabledFor(
  userId: string,
  category: string,
  channel: NotificationChannelName
): Promise<boolean> {
  const prefs = await getEffectivePreferences(userId);
  return Boolean(prefs[category]?.[channel] ?? false);
}
