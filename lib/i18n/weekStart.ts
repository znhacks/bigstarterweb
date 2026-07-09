import { enUS, id, arSA } from "date-fns/locale";
import { getLocaleMeta } from "@/config/i18n-culture";

const DATE_FNS_LOCALE_MAP = {
  enUS: enUS,
  id: id,
  ar: arSA
};

export function getDateFnsLocale(locale: string) {
  const meta = getLocaleMeta(locale);
  const key = meta.dateFnsLocale;
  return DATE_FNS_LOCALE_MAP[key] ?? enUS;
}

export function getWeekStartsOn(locale: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const meta = getLocaleMeta(locale);
  return meta.weekStartsOn;
}
