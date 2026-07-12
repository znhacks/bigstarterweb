// app/[locale]/settings/i18n-culture/view.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { PhoneInput } from "@/components/ui/phone-input";
import { AddressForm, AddressData } from "@/components/ui/address-form";

import { formatNumber, formatPercent, formatBytes, formatDateTime } from "@/lib/i18n/format";
import { formatPlural } from "@/lib/i18n/plural";
import { sortLocale } from "@/lib/i18n/collator";
import { formatMeasurement, CONVERSIONS } from "@/lib/i18n/units";
import { formatCurrency } from "@/lib/i18n/currency";
import { convertCurrency } from "@/actions/currency";
import { getLocaleMeta, getDisplayCurrency } from "@/config/i18n-culture";

interface I18nCultureViewProps {
  locale: string;
}

export function I18nCultureView({ locale }: I18nCultureViewProps) {
  const t = useTranslations("culture.showcase");
  const meta = getLocaleMeta(locale);

  // States: Formatting Playground
  const [numValue] = useState(1250500.75);
  const [percentValue] = useState(0.875);
  const [byteValue] = useState(458990212);
  const [nowDate] = useState(new Date());

  // States: Realtime Currency Converter
  const [baseAmount, setBaseAmount] = useState<number>(100000);
  const [convertedAmount, setConvertedAmount] = useState<number>(0);
  const [conversionRate, setConversionRate] = useState<number>(1);
  const displayCurrency = getDisplayCurrency(locale);

  // States: Pluralization Slider
  const [pluralCount, setPluralCount] = useState<number>(3);

  // States: Collation Compare
  const rawList = ["zebra", "äpple", "banan", "öron", "indonesia", "arabic", "10", "2"];
  const sortedList = sortLocale(rawList, locale);

  // States: Measurement System Converter
  const [metricLength, setMetricLength] = useState<number>(10); // 10 meter
  const [metricMass, setMetricMass] = useState<number>(500); // 500 gram
  const [metricTemp, setMetricTemp] = useState<number>(25); // 25 Celcius

  // States: Address Form Sandbox
  const [addressData, setAddressData] = useState<AddressData>({
    line1: "Jl. Jenderal Sudirman No. 12",
    line2: "Apt 4B",
    city: "Jakarta Selatan",
    region: "DKI Jakarta",
    postalCode: "12190",
    country: "ID"
  });

  // States: Phone Number Input
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  // Jalankan konversi mata uang server-side secara real-time
  useEffect(() => {
    const performConversion = async () => {
      try {
        const result = await convertCurrency(baseAmount, displayCurrency);
        setConvertedAmount(result.amount);
        setConversionRate(result.rate);
      } catch (err) {
        console.error("Gagal melakukan konversi:", err);
      }
    };
    performConversion();
  }, [baseAmount, displayCurrency]);

  return (
    <div className="space-y-6 p-1 md:p-6" dir={meta.dir}>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">{t("description")}</p>
      </div>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="global">{t("formatting")}</TabsTrigger>
          <TabsTrigger value="plural">{t("pluralization")}</TabsTrigger>
          <TabsTrigger value="collation">{t("collation")}</TabsTrigger>
          <TabsTrigger value="units">{t("measurements")}</TabsTrigger>
        </TabsList>

        {/* TAB 1: FORMATTING & LIVE CURRENCY CONVERTER */}
        <TabsContent value="global" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Visualisasi Format Global ({meta.bcp47})
                </CardTitle>
                <CardDescription>
                  Format angka, persentase, ukuran byte, dan tanggal disesuaikan otomatis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-sm">Angka Desimal:</span>
                  <span className="font-semibold">{formatNumber(numValue, locale)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-sm">Persentase:</span>
                  <span className="font-semibold">{formatPercent(percentValue, locale)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-sm">Ukuran Data (Bytes):</span>
                  <span className="font-semibold">{formatBytes(byteValue, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Tanggal Lokal:</span>
                  <span className="font-semibold">
                    {formatDateTime(nowDate, locale, { dateStyle: "long" })}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Konverter Mata Uang Instan (Base: IDR)</CardTitle>
                <CardDescription>
                  Memanggil Server Action dengan caching untuk melakukan kalkulasi kurs dari IDR ke
                  mata uang regional.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Input Nilai (IDR)</Label>
                  <Input
                    type="number"
                    value={baseAmount}
                    onChange={(e) => setBaseAmount(Number(e.target.value))}
                    className="border-border/80"
                  />
                </div>
                <div className="bg-muted/50 space-y-2 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kurs {displayCurrency}:</span>
                    <span>
                      1 IDR ={" "}
                      {formatNumber(conversionRate, locale, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6
                      })}{" "}
                      {displayCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Hasil Konversi:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(convertedAmount, locale)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: PLURALIZATION & CALENDAR SHIFTS */}
        <TabsContent value="plural" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pluralisasi Arab 6-Form Playground</CardTitle>
                <CardDescription>
                  Bahasa Arab membagi bentuk kata jamak menjadi 6 kondisi berbeda (Satu, Dua,
                  Sedikit, Banyak, Nol, dsb).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Atur Jumlah Item ({pluralCount})</Label>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    value={pluralCount}
                    onChange={(e) => setPluralCount(Number(e.target.value))}
                  />
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-muted-foreground mb-1 text-sm">
                    Hasil Pluralisasi Terformat ({locale.toUpperCase()}):
                  </p>
                  <p className="text-lg font-bold">
                    {formatPlural(pluralCount, locale, {
                      zero: "لا توجد كتب ({count} books)",
                      one: "كتاب واحد ({count} book)",
                      two: "كتابان ({count} books)",
                      few: "{count} كتب (few books)",
                      many: "{count} كتابًا (many books)",
                      other: "{count} كتاب (other books)"
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Pergeseran Kalender Lokal (First Day of Week)
                </CardTitle>
                <CardDescription>
                  Kalender mendeteksi hari awal mingguan otomatis: Sabtu (Arab), Senin (Indonesia),
                  Minggu (English).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center p-0 pt-2 pb-4">
                <Calendar mode="single" className="rounded-md border" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: LOCALE COLLATION (SORTING) */}
        <TabsContent value="collation" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perbandingan Pengurutan Alfabet Regional</CardTitle>
              <CardDescription>
                Sistem membandingkan list karakter menggunakan aturan Unicode Collation bawaan
                bahasa setempat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="bg-muted/30 rounded-lg border p-4">
                  <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
                    List Sebelum Diurutkan:
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {rawList.map((item, i) => (
                      <span key={i} className="bg-muted rounded-md border px-2.5 py-1 text-xs">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500/10 bg-emerald-50/10 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    Diurutkan Sesuai Aturan ({meta.bcp47}):
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {sortedList.map((item, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-xs font-semibold">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: MEASUREMENT CONVERSIONS */}
        <TabsContent value="units" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Konverter Unit Pengukuran Otomatis</CardTitle>
              <CardDescription>
                Input nilai dalam metrik standar, sistem akan mengonversi dan memformat ke sistem
                imperial jika locale adalah US.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* 1. Panjang */}
                <div className="space-y-2">
                  <Label>Unit Panjang (Meters)</Label>
                  <Input
                    type="number"
                    value={metricLength}
                    onChange={(e) => setMetricLength(Number(e.target.value))}
                    className="border-border/80"
                  />
                  <div className="bg-muted/50 rounded-md p-3 text-sm">
                    <span className="text-muted-foreground block text-xs">Output Terformat:</span>
                    <span className="font-semibold">
                      {meta.measurementSystem === "imperial"
                        ? formatMeasurement(
                            CONVERSIONS.length.metricToImperial(metricLength),
                            "length",
                            locale
                          )
                        : formatMeasurement(metricLength, "length", locale)}
                    </span>
                  </div>
                </div>

                {/* 2. Berat */}
                <div className="space-y-2">
                  <Label>Unit Berat (Grams)</Label>
                  <Input
                    type="number"
                    value={metricMass}
                    onChange={(e) => setMetricMass(Number(e.target.value))}
                    className="border-border/80"
                  />
                  <div className="bg-muted/50 rounded-md p-3 text-sm">
                    <span className="text-muted-foreground block text-xs">Output Terformat:</span>
                    <span className="font-semibold">
                      {meta.measurementSystem === "imperial"
                        ? formatMeasurement(
                            CONVERSIONS.mass.metricToImperial(metricMass),
                            "mass",
                            locale
                          )
                        : formatMeasurement(metricMass, "mass", locale)}
                    </span>
                  </div>
                </div>

                {/* 3. Suhu */}
                <div className="space-y-2">
                  <Label>Unit Suhu (°C)</Label>
                  <Input
                    type="number"
                    value={metricTemp}
                    onChange={(e) => setMetricTemp(Number(e.target.value))}
                    className="border-border/80"
                  />
                  <div className="bg-muted/50 rounded-md p-3 text-sm">
                    <span className="text-muted-foreground block text-xs">Output Terformat:</span>
                    <span className="font-semibold">
                      {meta.measurementSystem === "imperial"
                        ? formatMeasurement(
                            CONVERSIONS.temperature.metricToImperial(metricTemp),
                            "temperature",
                            locale
                          )
                        : formatMeasurement(metricTemp, "temperature", locale)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FORM SANDBOX SECTION */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sandbox Input Telepon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uji Format & Validasi Input Telepon</CardTitle>
            <CardDescription>
              Menyusun format dan menyisipkan tanda spasi pemisah nomor telepon secara otomatis saat
              diketik.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Uji Nomor Telepon</Label>
              {/* Diubah agar melewatkan string kosong "" sebagai fallback jika input bernilai undefined */}
              <PhoneInput
                defaultCountry="ID"
                value={phoneNumber}
                onChange={(val) => setPhoneNumber(val || "")}
              />
            </div>
            <div className="bg-muted/50 rounded-md p-3 text-xs">
              <span className="text-muted-foreground block">Raw Output State:</span>
              <span className="font-mono font-bold">{phoneNumber || "No number entered"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Sandbox Address Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pratinjau Tata Letak Formulir Alamat Dinamis
            </CardTitle>
            <CardDescription>
              Field input secara otomatis tersusun ulang dan diubah penamaannya berdasarkan bahasa
              aktif.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddressForm
              locale={locale}
              data={addressData}
              errors={{}}
              onChange={(field, val) => setAddressData((prev) => ({ ...prev, [field]: val }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
