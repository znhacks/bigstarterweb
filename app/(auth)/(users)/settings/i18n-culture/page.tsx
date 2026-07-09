// app/[locale]/settings/i18n-culture/page.tsx
import React from "react";
import { getLocale } from "next-intl/server";
import { I18nCultureView } from "./view";

export default async function I18nCulturePage() {
  const locale = await getLocale();
  return <I18nCultureView locale={locale} />;
}
