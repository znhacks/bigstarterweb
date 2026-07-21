import * as React from "react";
import { Globe, Clock, Coins, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { tenantConfig } from "@/config/tenant";

interface RegionalSettingsFormProps {
  isReadOnly: boolean;
  isSaving: boolean;
  defaultLocale: string;
  setDefaultLocale: (val: string) => void;
  timezone: string;
  setTimezone: (val: string) => void;
  currency: string;
  setCurrency: (val: string) => void;
  onSave: () => Promise<void>;
  tCommon: (key: string) => string;
}

export function RegionalSettingsForm({
  isReadOnly,
  isSaving,
  defaultLocale,
  setDefaultLocale,
  timezone,
  setTimezone,
  currency,
  setCurrency,
  onSave,
  tCommon
}: RegionalSettingsFormProps) {
  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row">
        {/* Sisi Kiri: Judul & Deskripsi */}
        <div className="space-y-1 lg:max-w-xs">
          <h2 className="text-foreground text-base font-semibold">Regional & Localization</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Configure default language, timezone, and currency preferences.
          </p>
        </div>

        {/* Sisi Kanan: Input Form */}
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 lg:max-w-xl">
          {/* Bahasa */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <Globe className="text-muted-foreground h-3.5 w-3.5" /> Language
            </Label>
            <select
              disabled={isReadOnly || isSaving}
              value={defaultLocale}
              onChange={(e) => setDefaultLocale(e.target.value)}
              className="border-border/80 text-foreground bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none">
              {tenantConfig.supported.locales.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Zona Waktu */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <Clock className="text-muted-foreground h-3.5 w-3.5" /> Timezone
            </Label>
            <select
              disabled={isReadOnly || isSaving}
              value={timezone || tenantConfig.defaults.timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="border-border/80 text-foreground bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none">
              <option value="UTC">UTC</option>
              <option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>
              <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
              <option value="America/New_York">America/New_York (GMT-5)</option>
            </select>
          </div>

          {/* Mata Uang */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <Coins className="text-muted-foreground h-3.5 w-3.5" /> Currency
            </Label>
            <select
              disabled={isReadOnly || isSaving}
              value={currency || tenantConfig.defaults.currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border-border/80 text-foreground bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none">
              {tenantConfig.supported.currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tombol Simpan */}
      {!isReadOnly && (
        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={isSaving}
            variant="secondary"
            size="sm"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-2 rounded-lg px-5 text-xs">
            {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
            {tCommon("save")}
          </Button>
        </div>
      )}
    </div>
  );
}
