// components/ui/address-form.tsx
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAddressConfig, AddressField } from "@/config/i18n-culture";
import { getCountryList } from "@/lib/i18n/countries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export interface AddressData {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

interface AddressFormProps {
  locale: string;
  data: AddressData;
  errors: Partial<Record<AddressField, string>>;
  onChange: (field: AddressField, value: string) => void;
  disabled?: boolean;
}

export function AddressForm({
  locale,
  data,
  errors,
  onChange,
  disabled = false
}: AddressFormProps) {
  const config = getAddressConfig(locale);
  const countries = getCountryList(locale);

  // Label Penerjemahan Dinamis Lokal (Fallback jika dictionary JSON belum dimuat)
  const getFieldLabels = (field: AddressField): string => {
    const labels: Record<AddressField, Record<string, string>> = {
      line1: {
        en: "Address Line 1",
        id: "Alamat Baris 1",
        ar: "العنوان السطر 1"
      },
      line2: {
        en: "Address Line 2 (Optional)",
        id: "Alamat Baris 2 (Opsional)",
        ar: "العنوان السطر 2 (اختياري)"
      },
      city: {
        en: "City",
        id: "Kota / Kabupaten",
        ar: "المدينة"
      },
      region: {
        en: "State / Province",
        id: "Provinsi",
        ar: "المنطقة / الولاية"
      },
      postalCode: {
        en: "ZIP Code",
        id: "Kode Pos",
        ar: "الرمز البريدي"
      },
      country: {
        en: "Country",
        id: "Negara",
        ar: "البلد"
      }
    };

    const currentLabels = labels[field];
    return currentLabels[locale] ?? currentLabels["en"];
  };

  const isRequired = (field: AddressField) => config.required.includes(field);

  const renderField = (field: AddressField) => {
    const labelText = getFieldLabels(field);
    const hasError = !!errors[field];

    if (field === "country") {
      return (
        <div key={field} className="space-y-1.5">
          <Label className="text-sm font-medium">
            {labelText} {isRequired(field) && <span className="text-destructive">*</span>}
          </Label>
          <Select
            value={data.country}
            onValueChange={(val) => onChange("country", val)}
            disabled={disabled}>
            <SelectTrigger
              className={
                hasError ? "border-destructive focus-visible:ring-destructive" : "border-border/80"
              }>
              <SelectValue placeholder="Select country..." />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasError && <p className="text-destructive text-xs">{errors[field]}</p>}
        </div>
      );
    }

    return (
      <div key={field} className="space-y-1.5">
        <Label className="text-sm font-medium">
          {labelText} {isRequired(field) && <span className="text-destructive">*</span>}
        </Label>
        <Input
          type="text"
          value={data[field]}
          onChange={(e) => onChange(field, e.target.value)}
          disabled={disabled}
          placeholder={field === "postalCode" ? config.postalPlaceholder : undefined}
          className={
            hasError ? "border-destructive focus-visible:ring-destructive" : "border-border/80"
          }
        />
        {hasError && <p className="text-destructive text-xs">{errors[field]}</p>}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {config.order.map((field) => {
        // Rentangkan input Line 1 & Line 2 agar memakan lebar penuh (full span)
        const isFullWidth = field === "line1" || field === "line2";
        return (
          <div key={field} className={isFullWidth ? "md:col-span-2" : ""}>
            {renderField(field)}
          </div>
        );
      })}
    </div>
  );
}
