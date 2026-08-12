"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/lib/supabase";
import { countryRepository } from "@/supabase/repositories/countries";
import { stateRepository } from "@/supabase/repositories/states";
import { cityRepository } from "@/supabase/repositories/cities";
import { subdistrictRepository } from "@/supabase/repositories/sub-districts";
import { villageRepository } from "@/supabase/repositories/villages";
import { getCountryDefaults, type CountryDefaults } from "@/lib/i18n/country-defaults";
import { useTranslations } from "next-intl";

export interface AddressData {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
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

  onCountryDefaults?: (defaults: CountryDefaults) => void;
  disabled?: boolean;
}

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

  const [countryId, setCountryId] = React.useState<number | null>(null);
  const [stateId, setStateId] = React.useState<number | null>(null);
  const [cityId, setCityId] = React.useState<number | null>(null);
  const [kecamatanId, setKecamatanId] = React.useState<number | null>(null);

  const isID = data.country === "ID";

  const didInit = React.useRef(false);
  const lastResolvedSignature = React.useRef("");

  React.useEffect(() => {
    (async () => {
      const { data: rows } = await (
        await countryRepository(supabase)
      )
        .query()
        .select("id, name, iso2, currency, timezones")
        .order("name", { ascending: true });
      if (rows) setCountries(rows as unknown as CountryRow[]);
    })();
  }, []);

  const countryOpts: GeoOption[] = countries.map((c) => ({ value: c.iso2, label: c.name }));

  const fetchStates = React.useCallback(async (cId: number): Promise<GeoOption[]> => {
    const { data: rows } = await (
      await stateRepository(supabase)
    )
      .query()
      .select("id, name")
      .eq("country_id", cId)
      .order("name", { ascending: true })
      .range(0, 2000);
    const opts = (rows || []).map((r: any) => ({ value: String(r.id), label: r.name }));
    setStates(opts);
    return opts;
  }, []);

  const fetchCities = React.useCallback(
    async (sId: number): Promise<GeoOption[]> => {
      const { data: rows } = await (
        await cityRepository(supabase)
      )
        .query()
        .select("id, name")
        .eq("state_id", sId)
        .order("name", { ascending: true })
        .range(0, 2000);

      let filteredRows = rows || [];
      if (isID && filteredRows.length > 0) {
        // Untuk Indonesia, prioritaskan entri resmi "Kabupaten ..." dan "Kota ..." yang memiliki Kecamatan & Desa lengkap
        const official = filteredRows.filter(
          (r: any) => r.name.startsWith("Kabupaten ") || r.name.startsWith("Kota ")
        );
        if (official.length > 0) {
          filteredRows = official;
        }
      }

      const opts = filteredRows.map((r: any) => ({ value: String(r.id), label: r.name }));
      setCities(opts);
      return opts;
    },
    [isID]
  );

  const fetchKecamatan = React.useCallback(
    async (kabId: number, currentCityLabel?: string): Promise<GeoOption[]> => {
      let { data: rows } = await (
        await subdistrictRepository(supabase)
      )
        .query()
        .select("id, nama_kecamatan")
        .eq("id_kab_kota", kabId)
        .order("nama_kecamatan", { ascending: true })
        .range(0, 2000);

      // Fallback: Jika id_kab_kota tidak mengembalikan kecamatan, cari entri Kota/Kabupaten alternatif di stateId
      if ((!rows || rows.length === 0) && currentCityLabel && stateId) {
        const cleanName = currentCityLabel.replace(/^(Kota|Kabupaten)\s+/i, "").trim();
        const { data: altCities } = await (await cityRepository(supabase))
          .query()
          .select("id")
          .eq("state_id", stateId)
          .ilike("name", `%${cleanName}%`);

        if (altCities && altCities.length > 0) {
          for (const altC of altCities) {
            const { data: altRows } = await (await subdistrictRepository(supabase))
              .query()
              .select("id, nama_kecamatan")
              .eq("id_kab_kota", altC.id)
              .order("nama_kecamatan", { ascending: true })
              .range(0, 2000);
            if (altRows && altRows.length > 0) {
              rows = altRows;
              break;
            }
          }
        }
      }

      const opts = (rows || []).map((r: any) => ({ value: String(r.id), label: r.nama_kecamatan }));
      setKecamatans(opts);
      return opts;
    },
    [stateId]
  );

  const fetchDesa = React.useCallback(async (kecId: number): Promise<DesaRow[]> => {
    const { data: rows } = await (
      await villageRepository(supabase)
    )
      .query()
      .select("id, nama_desa_kelurahan, kode_pos")
      .eq("id_kecamatan", kecId)
      .order("nama_desa_kelurahan", { ascending: true })
      .range(0, 2000);
    const opts = (rows || []).map((r: any) => ({
      value: String(r.id),
      label: r.nama_desa_kelurahan,
      kode_pos: r.kode_pos
    }));
    setDesas(opts);
    return opts;
  }, []);

  React.useEffect(() => {
    const currentSignature = `${data.country || ""}-${data.region || ""}-${data.city || ""}-${data.kecamatan || ""}-${data.desa || ""}`;

    if (countries.length === 0 || !data.country) return;
    if (didInit.current && lastResolvedSignature.current === currentSignature) return;

    didInit.current = true;
    lastResolvedSignature.current = currentSignature;

    (async () => {
      try {
        const c = countries.find((x) => x.iso2.toLowerCase() === data.country.toLowerCase());
        if (!c) return;
        setCountryId(c.id);

        const stateOpts = await fetchStates(c.id);
        if (!data.region) return;
        const cleanedRegion = data.region.trim().toLowerCase();
        const s = stateOpts.find((o) => o.label.trim().toLowerCase() === cleanedRegion);
        if (!s) return;
        const sId = Number(s.value);
        setStateId(sId);

        const cityOpts = await fetchCities(sId);
        if (!data.city) return;
        const cleanedCity = data.city.trim().toLowerCase();
        const ci = cityOpts.find((o) => o.label.trim().toLowerCase() === cleanedCity);
        if (!ci) return;
        const cId = Number(ci.value);
        setCityId(cId);

        if (c.iso2 !== "ID") return;

        const kecamatanOpts = await fetchKecamatan(cId, data.city);
        if (!data.kecamatan) return;
        const cleanedKecamatan = data.kecamatan.trim().toLowerCase();
        const k = kecamatanOpts.find((o) => o.label.trim().toLowerCase() === cleanedKecamatan);
        if (!k) return;
        const kId = Number(k.value);
        setKecamatanId(kId);

        await fetchDesa(kId);
      } catch (error) {
        console.error("Gagal memuat struktur alamat:", error);
      }
    })();
  }, [
    countries,
    data.country,
    data.region,
    data.city,
    data.kecamatan,
    data.desa,
    fetchStates,
    fetchCities,
    fetchKecamatan,
    fetchDesa
  ]);

  const getDesaValue = () => {
    if (!data.desa || desas.length === 0) return "";
    const cleanedDesa = data.desa.trim().toLowerCase();
    const found = desas.find((d) => (d.label || "").trim().toLowerCase() === cleanedDesa);
    return found ? String(found.value) : "";
  };

  const formatPostalCode = (code: string | null | undefined): string => {
    if (!code) return "";
    return String(code).replace(/\.0$/, "").trim();
  };

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
    const cityLabel = opt?.label || "";
    onChange("city", cityLabel);
    onChange("kecamatan", "");
    onChange("desa", "");
    onChange("postalCode", "");
    if (isID && cId) fetchKecamatan(cId, cityLabel);
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
    if (opt?.kode_pos) {
      onChange("postalCode", formatPostalCode(opt.kode_pos));
    }
  };

  return (
    <div className="space-y-4">
      {/* Alamat Baris 1 */}
      <div className="space-y-1.5">
        <Label htmlFor="address-line1" className="text-sm font-medium">
          {t("line1")}
        </Label>
        <Input
          id="address-line1"
          value={data.line1 || ""}
          onChange={(e) => onChange("line1", e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.line1}
          aria-describedby={errors.line1 ? "address-line1-error" : undefined}
          className="border-border/80"
        />
        {errors.line1 && (
          <p id="address-line1-error" className="text-destructive mt-1 text-xs">
            {errors.line1}
          </p>
        )}
      </div>

      {/* Alamat Baris 2 */}
      <div className="space-y-1.5">
        <Label htmlFor="address-line2" className="text-sm font-medium">
          {t("line2")}
        </Label>
        <Input
          id="address-line2"
          value={data.line2 || ""}
          onChange={(e) => onChange("line2", e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.line2}
          aria-describedby={errors.line2 ? "address-line2-error" : undefined}
          className="border-border/80"
        />
        {errors.line2 && (
          <p id="address-line2-error" className="text-destructive mt-1 text-xs">
            {errors.line2}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Country */}
        <div className="space-y-1.5">
          <Label htmlFor="address-country" className="text-sm font-medium">
            {t("country")}
          </Label>
          <SearchableSelect
            id="address-country"
            options={countryOpts}
            value={data.country || ""}
            onChange={onCountry}
            placeholder={t("searchCountry")}
            searchPlaceholder={t("searchCountry")}
            emptyText={t("noResults")}
            disabled={disabled || countries.length === 0}
          />
          {errors.country && <p className="text-destructive mt-1 text-xs">{errors.country}</p>}
        </div>

        {/* State/Province */}
        <div className="space-y-1.5">
          <Label htmlFor="address-state" className="text-sm font-medium">
            {t("region")}
          </Label>
          <SearchableSelect
            id="address-state"
            options={states}
            value={stateId ? String(stateId) : ""}
            onChange={onState}
            placeholder={t("searchState")}
            searchPlaceholder={t("searchState")}
            emptyText={t("noResults")}
            disabled={disabled || !data.country}
          />
          {errors.region && <p className="text-destructive mt-1 text-xs">{errors.region}</p>}
        </div>

        {/* City/Regency */}
        <div className="space-y-1.5">
          <Label htmlFor="address-city" className="text-sm font-medium">
            {t("city")}
          </Label>
          <SearchableSelect
            id="address-city"
            options={cities}
            value={cityId ? String(cityId) : ""}
            onChange={onCity}
            placeholder={t("searchCity")}
            searchPlaceholder={t("searchCity")}
            emptyText={t("noResults")}
            disabled={disabled || !stateId}
          />
          {errors.city && <p className="text-destructive mt-1 text-xs">{errors.city}</p>}
        </div>

        {/* District (Kecamatan) */}
        <div className="space-y-1.5">
          <Label htmlFor="address-kecamatan" className="text-sm font-medium">
            {t("kecamatan")}
          </Label>
          <SearchableSelect
            id="address-kecamatan"
            options={kecamatans}
            value={kecamatanId ? String(kecamatanId) : ""}
            onChange={onKecamatan}
            placeholder={isID ? t("searchKecamatan") : "-"}
            searchPlaceholder={t("searchKecamatan")}
            emptyText={t("noResults")}
            disabled={disabled || !isID || !cityId}
          />
          {errors.kecamatan && <p className="text-destructive mt-1 text-xs">{errors.kecamatan}</p>}
        </div>

        {/* Village/Sub-district (Desa) */}
        <div className="space-y-1.5">
          <Label htmlFor="address-desa" className="text-sm font-medium">
            {t("desa")}
          </Label>
          <SearchableSelect
            id="address-desa"
            options={desas}
            value={getDesaValue()}
            onChange={onDesa}
            placeholder={isID ? t("searchDesa") : "-"}
            searchPlaceholder={t("searchDesa")}
            emptyText={t("noResults")}
            disabled={disabled || !isID || !kecamatanId}
          />
          {errors.desa && <p className="text-destructive mt-1 text-xs">{errors.desa}</p>}
        </div>

        {/* Postal Code */}
        <div className="space-y-1.5">
          <Label htmlFor="address-postalCode" className="text-sm font-medium">
            {t("postalCode")}
          </Label>
          <Input
            id="address-postalCode"
            value={formatPostalCode(data.postalCode)}
            onChange={(e) => onChange("postalCode", e.target.value)}
            disabled={disabled}
            placeholder={isID ? t("autoFromDesa") : t("postalCode")}
            aria-invalid={!!errors.postalCode}
            aria-describedby={isID ? "address-postalCode-desc" : undefined}
            className="border-border/80"
          />
          {isID && (
            <p id="address-postalCode-desc" className="text-muted-foreground text-[10px]">
              {t("autoFromDesaDesc")}
            </p>
          )}
          {errors.postalCode && (
            <p className="text-destructive mt-1 text-xs">{errors.postalCode}</p>
          )}
        </div>
      </div>
    </div>
  );
}
