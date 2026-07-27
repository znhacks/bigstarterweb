export interface BanDuration {
  key: string;
  labelKey: string;
  ms: number | null;
}

export const BAN_DURATIONS: BanDuration[] = [
  { key: "1d", labelKey: "ban.durations.1d", ms: 86_400_000 },
  { key: "7d", labelKey: "ban.durations.7d", ms: 7 * 86_400_000 },
  { key: "30d", labelKey: "ban.durations.30d", ms: 30 * 86_400_000 },
  { key: "permanent", labelKey: "ban.durations.permanent", ms: null }
];

export const DEFAULT_BAN_KEY = BAN_DURATIONS[0]?.key ?? "1d";

export function getBanDuration(key: string): BanDuration | undefined {
  return BAN_DURATIONS.find((d) => d.key === key);
}

export function computeBannedUntil(key: string): string | null {
  const dur = getBanDuration(key) ?? getBanDuration(DEFAULT_BAN_KEY);
  if (!dur || dur.ms === null) return null;
  return new Date(Date.now() + dur.ms).toISOString();
}
