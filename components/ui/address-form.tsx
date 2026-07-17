// components/ui/address-form.tsx
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/lib/supabase";
import { getCountryDefaults, type CountryDefaults } from "@/lib/i18n/country-defaults";
import { useTranslations } from "next-intl";

export interface AddressData {
  line1: string;
  line2: string;
  city: string; // city/kabupaten name
  region: string; // state/province name
  postalCode: string;
  country: string; // ISO alpha-2
  kecamatan?: string;
  desa?: string;
}

type GeoOption = { value: string; label: string };
type CountryRow = {
  id: number;
  name: string;
  iso2: string;
  currency: string | null;
  timezones: string | null;
};
type DesaRow = { value: string; label: string; kode_pos: string | null };

interface AddressFormProps {
  locale: string;
  data: AddressData;
  errors?: Partial<Record<string, string>>;
  onChange: (field: keyof AddressData, value: string) => void;
  /** Dipanggil saat negara berubah, mengirim default i18n (currency/timezone/locale). */
  onCountryDefaults?: (defaults: CountryDefaults) => void;
  disabled?: boolean;
}

const LIMIT = 500;

export function AddressForm({
  locale,
  data,
  errors = {},
  onChange,
  onCountryDefaults,
  disabled = false
}: AddressFormProps) {
  const t = useTranslations("address");

  const [countries, setCountries] = React.useState<CountryRow[]>([]);
  const [states, setStates] = React.useState<GeoOption[]>([]);
  const [cities, setCities] = React.useState<GeoOption[]>([]);
  const [kecamatans, setKecamatans] = React.useState<GeoOption[]>([]);
  const [desas, setDesas] = React.useState<DesaRow[]>([]);

  // id terpilih per level (transien — tidak dipersist)
  const [countryId, setCountryId] = React.useState<number | null>(null);
  const [stateId, setStateId] = React.useState<number | null>(null);
  const [cityId, setCityId] = React.useState<number | null>(null);
  const [kecamatanId, setKecamatanId] = React.useState<number | null>(null);

  const isID = data.country === "ID";
  const didInit = React.useRef(false);

  // --- Load countries sekali ---
  React.useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("countries")
        .select("id, name, iso2, currency, timezones")
        .order("name", { ascending: true });
      if (rows) setCountries(rows as unknown as CountryRow[]);
    })();
  }, []);

  const countryOpts: GeoOption[] = countries.map((c) => ({ value: c.iso2, label: c.name }));

  // --- Fetch helpers ---
  // Semua helper ini MENGEMBALIKAN data hasil fetch (bukan hanya set state),
  // supaya alur resolve (name -> id) di bawah bisa langsung memakai hasilnya
  // tanpa bergantung pada state React yang ter-update secara asinkron
  // (sumber bug: data tersimpan sudah benar, tapi setelah reload gagal
  // ter-resolve karena race condition antara setState dan pembacaan state).
  const fetchStates = React.useCallback(async (cId: number): Promise<GeoOption[]> => {
    const { data: rows } = await supabase
      .from("states")
      .select("id, name")
      .eq("country_id", cId)
      .order("name", { ascending: true })
      .limit(LIMIT);
    const opts = (rows || []).map((r: any) => ({ value: String(r.id), label: r.name }));
    setStates(opts);
    return opts;
  }, []);

  const fetchCities = React.useCallback(async (sId: number): Promise<GeoOption[]> => {
    const { data: rows } = await supabase
      .from("cities")
      .select("id, name")
      .eq("state_id", sId)
      .order("name", { ascending: true })
      .limit(LIMIT);
    const opts = (rows || []).map((r: any) => ({ value: String(r.id), label: r.name }));
    setCities(opts);
    return opts;
  }, []);

  const fetchKecamatan = React.useCallback(async (kabId: number): Promise<GeoOption[]> => {
    const { data: rows } = await supabase
      .from("kecamatan")
      .select("id, nama_kecamatan")
      .eq("id_kab_kota", kabId)
      .order("nama_kecamatan", { ascending: true })
      .limit(LIMIT);
    const opts = (rows || []).map((r: any) => ({ value: String(r.id), label: r.nama_kecamatan }));
    setKecamatans(opts);
    return opts;
  }, []);

  const fetchDesa = React.useCallback(async (kecId: number): Promise<DesaRow[]> => {
    const { data: rows } = await supabase
      .from("desa")
      .select("id, nama_desa_kelurahan, kode_pos")
      .eq("id_kecamatan", kecId)
      .order("nama_desa_kelurahan", { ascending: true })
      .limit(LIMIT);
    const opts = (rows || []).map((r: any) => ({
      value: String(r.id),
      label: r.nama_desa_kelurahan,
      kode_pos: r.kode_pos
    }));
    setDesas(opts);
    return opts;
  }, []);

  // --- Resolve data masuk (names → ids) saat countries siap (sekali) ---
  React.useEffect(() => {
    if (didInit.current || countries.length === 0 || !data.country) return;
    didInit.current = true;

    (async () => {
      const c = countries.find((x) => x.iso2 === data.country);
      if (!c) return;
      setCountryId(c.id);

      const stateOpts = await fetchStates(c.id);
      if (!data.region) return;

      const s = stateOpts.find((o) => o.label === data.region);
      if (!s) return;
      const sId = Number(s.value);
      setStateId(sId);

      const cityOpts = await fetchCities(sId);
      if (!data.city) return;

      const ci = cityOpts.find((o) => o.label === data.city);
      if (!ci) return;
      const cId = Number(ci.value);
      setCityId(cId);

      if (c.iso2 !== "ID") return;

      const kecamatanOpts = await fetchKecamatan(cId);
      if (!data.kecamatan) return;

      const k = kecamatanOpts.find((o) => o.label === data.kecamatan);
      if (!k) return;
      const kId = Number(k.value);
      setKecamatanId(kId);

      await fetchDesa(kId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, data.country]);

  // --- Handlers (user selection) ---
  const onCountry = (iso2: string) => {
    const c = countries.find((x) => x.iso2 === iso2);
    setCountryId(c?.id ?? null);
    setStates([]);
    setCities([]);
    setKecamatans([]);
    setDesas([]);
    setStateId(null);
    setCityId(null);
    setKecamatanId(null);
    onChange("country", iso2);
    onChange("region", "");
    onChange("city", "");
    onChange("kecamatan", "");
    onChange("desa", "");
    onChange("postalCode", "");
    if (c && onCountryDefaults) {
      // Default dari DB countries (currency/timezones) + locale fallback statis
      let tz: string | undefined;
      try {
        const tzRaw = c.timezones ? JSON.parse(c.timezones) : null;
        tz =
          Array.isArray(tzRaw) && tzRaw[0]?.zoneName
            ? tzRaw[0].zoneName
            : Array.isArray(tzRaw)
              ? tzRaw[0]
              : undefined;
      } catch {}
      const fallback = getCountryDefaults(iso2);
      onCountryDefaults({
        currency: c.currency || fallback.currency,
        timezone: tz || fallback.timezone,
        locale: fallback.locale
      });
    }
    if (c) fetchStates(c.id);
  };

  const onState = (val: string) => {
    const sId = Number(val);
    setStateId(sId);
    setCities([]);
    setKecamatans([]);
    setDesas([]);
    setCityId(null);
    setKecamatanId(null);
    const opt = states.find((o) => o.value === val);
    onChange("region", opt?.label || "");
    onChange("city", "");
    onChange("kecamatan", "");
    onChange("desa", "");
    onChange("postalCode", "");
    if (sId) fetchCities(sId);
  };

  const onCity = (val: string) => {
    const cId = Number(val);
    setCityId(cId);
    setKecamatans([]);
    setDesas([]);
    setKecamatanId(null);
    const opt = cities.find((o) => o.value === val);
    onChange("city", opt?.label || "");
    onChange("kecamatan", "");
    onChange("desa", "");
    onChange("postalCode", "");
    if (isID && cId) fetchKecamatan(cId);
  };

  const onKecamatan = (val: string) => {
    const kId = Number(val);
    setKecamatanId(kId);
    setDesas([]);
    const opt = kecamatans.find((o) => o.value === val);
    onChange("kecamatan", opt?.label || "");
    onChange("desa", "");
    onChange("postalCode", "");
    if (kId) fetchDesa(kId);
  };

  const onDesa = (val: string) => {
    const opt = desas.find((o) => o.value === val);
    onChange("desa", opt?.label || "");
    if (opt?.kode_pos) onChange("postalCode", opt.kode_pos);
  };

  return (
    <div className="space-y-4">
      {/* Line 1 & 2 */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t("line1")}</Label>
        <Input
          value={data.line1}
          onChange={(e) => onChange("line1", e.target.value)}
          disabled={disabled}
          className="border-border/80"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{t("line2")}</Label>
        <Input
          value={data.line2}
          onChange={(e) => onChange("line2", e.target.value)}
          disabled={disabled}
          className="border-border/80"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Country */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("country")}</Label>
          <SearchableSelect
            options={countryOpts}
            value={data.country}
            onChange={onCountry}
            placeholder={t("searchCountry")}
            searchPlaceholder={t("searchCountry")}
            emptyText={t("noResults")}
            disabled={disabled || countries.length === 0}
          />
        </div>

        {/* State / Province */}
        {data.country && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("region")}</Label>
            <SearchableSelect
              options={states}
              value={stateId ? String(stateId) : ""}
              onChange={onState}
              placeholder={t("searchState")}
              searchPlaceholder={t("searchState")}
              emptyText={t("noResults")}
              disabled={disabled}
            />
          </div>
        )}

        {/* City */}
        {stateId && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("city")}</Label>
            <SearchableSelect
              options={cities}
              value={cityId ? String(cityId) : ""}
              onChange={onCity}
              placeholder={t("searchCity")}
              searchPlaceholder={t("searchCity")}
              emptyText={t("noResults")}
              disabled={disabled}
            />
          </div>
        )}

        {/* Kecamatan (ID only) */}
        {isID && cityId && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("kecamatan")}</Label>
            <SearchableSelect
              options={kecamatans}
              value={kecamatanId ? String(kecamatanId) : ""}
              onChange={onKecamatan}
              placeholder={t("searchKecamatan")}
              searchPlaceholder={t("searchKecamatan")}
              emptyText={t("noResults")}
              disabled={disabled}
            />
          </div>
        )}

        {/* Desa (ID only) */}
        {isID && kecamatanId && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("desa")}</Label>
            <SearchableSelect
              options={desas}
              value={data.desa ? String(desas.find((d) => d.label === data.desa)?.value || "") : ""}
              onChange={onDesa}
              placeholder={t("searchDesa")}
              searchPlaceholder={t("searchDesa")}
              emptyText={t("noResults")}
              disabled={disabled}
            />
          </div>
        )}

        {/* Postal Code */}
        {(isID ? kecamatanId || cityId : cityId) && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("postalCode")}</Label>
            <Input
              value={data.postalCode}
              onChange={(e) => onChange("postalCode", e.target.value)}
              disabled={disabled || isID}
              placeholder={isID ? t("autoFromDesa") : t("postalCode")}
              className="border-border/80"
            />
            {isID && <p className="text-muted-foreground text-[10px]">{t("autoFromDesaDesc")}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
