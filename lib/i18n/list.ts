import { getLocaleMeta } from "@/config/i18n-culture";

export function formatList(
  items: string[],
  locale: string,
  options?: Intl.ListFormatOptions
): string {
  if (items.length === 0) return "";
  const meta = getLocaleMeta(locale);
  try {
    const formatter = new Intl.ListFormat(meta.bcp47, {
      style: "long",
      type: "conjunction",
      ...options
    });
    return formatter.format(items);
  } catch {
    return items.join(", ");
  }
}
