// app/(auth)/onboarding/onboarding-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Globe } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { countryRepository } from "@/supabase/repositories/countries";
import { profileRepository } from "@/supabase/repositories/profiles";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCountryDefaults } from "@/lib/i18n/country-defaults";
import { LOCALE_COOKIE } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const USER_CURRENCY_COOKIE = "USER_CURRENCY";
const USER_TIMEZONE_COOKIE = "USER_TIMEZONE";
const COOKIE_OPTS = "path=/;max-age=31536000;SameSite=Lax";

type CountryRow = {
  id: number;
  name: string;
  iso2: string;
  currency: string | null;
  timezones: string | null;
};

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};${COOKIE_OPTS}`;
}

export function OnboardingForm({ next }: { next: string }) {
  const router = useRouter();
  const t = useTranslations("onboarding");

  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [iso2, setIso2] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const countryRepo = await countryRepository(supabase);
      const { data } = await countryRepo
        .query()
        .select("id, name, iso2, currency, timezones")
        .order("name", { ascending: true });
      if (data) setCountries(data as unknown as CountryRow[]);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!iso2) {
      setError(t("selectCountry"));
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const row = countries.find((c) => c.iso2 === iso2);
      const defaults = getCountryDefaults(iso2);

      // Currency & timezone dari DB countries (live); locale dari map default
      const currency = row?.currency || defaults.currency || "USD";
      let timezone = defaults.timezone || "UTC";
      try {
        const tzRaw = row?.timezones ? JSON.parse(row.timezones) : null;
        const first = Array.isArray(tzRaw) ? tzRaw[0] : null;
        timezone =
          (first?.zoneName as string) || (typeof first === "string" ? first : timezone) || timezone;
      } catch {}
      const locale = defaults.locale || "en";

      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profileRepo = await profileRepository(supabase);
      const { error: updErr } = await profileRepo
        .query()
        .update({
          address_country: iso2,
          preferred_language: locale,
          timezone,
          currency
        })
        .eq("id", user.id);
      if (updErr) throw updErr;

      // Set cookie i18n + currency + timezone (pattern language-switcher)
      setCookie(LOCALE_COOKIE, locale);
      setCookie(USER_CURRENCY_COOKIE, currency);
      setCookie(USER_TIMEZONE_COOKIE, timezone);
      if (typeof document !== "undefined") {
        document.documentElement.lang = locale;
        document.documentElement.dir = "ltr";
      }

      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setError(e.message || t("error"));
    } finally {
      setSaving(false);
    }
  };

  const options = countries.map((c) => ({ value: c.iso2, label: c.name }));

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-8">
          <div className="space-y-2 text-center">
            <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
              <Globe className="text-primary h-6 w-6" />
            </div>
            <h1 className="text-foreground text-xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground text-sm">{t("desc")}</p>
          </div>

          <div className="space-y-2">
            <SearchableSelect
              options={options}
              value={iso2}
              onChange={setIso2}
              placeholder={t("selectCountry")}
              searchPlaceholder={t("searchCountry")}
              emptyText={t("noResults")}
              disabled={saving || countries.length === 0}
            />
          </div>

          {error && <p className="text-destructive text-center text-sm">{error}</p>}

          <Button onClick={handleSubmit} disabled={saving || !iso2} className="w-full">
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("continue")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
