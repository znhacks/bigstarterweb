"use client";

import * as React from "react";
import {
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Upload,
  User as UserIcon,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";

import { cn } from "@/lib/utils";
import { getAllTimezones } from "@/lib/timezones";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { AddressForm } from "@/components/ui/address-form";
import { LOCALES, LOCALE_META } from "@/config/i18n-culture";
import { tenantConfig } from "@/config/tenant";
import { Textarea } from "@/components/ui/textarea";
import { useGeneralSettings } from "./logic";

const supportedLocales = LOCALES.map((code) => ({ code, label: LOCALE_META[code].label }));
const supportedTimezones = getAllTimezones();

export function GeneralSettingsPage() {
  const {
    t,
    tCommon,
    uiLocale,
    isLoading,
    alertMessage,
    setAlertMessage,
    fullName,
    setFullName,
    email,
    setEmail,
    avatarUrl,
    localLanguage,
    setLocalLanguage,
    timezone,
    setTimezone,
    currency,
    setCurrency,
    isSavingCurrency,
    handleSaveCurrency,
    description,
    setDescription,
    phone,
    setPhone,
    isUploadingAvatar,
    isSavingLang,
    isSavingTz,
    isSavingEmail,
    isSavingProfile,
    isDeleting,
    isConfirmOpen,
    setIsConfirmOpen,
    cropperOpen,
    setCropperOpen,
    address,
    addressErrors,
    handleAddressChange,
    handleSaveProfile,
    handleCropComplete,
    handleSaveLanguage,
    handleSaveTimezone,
    handleSaveEmail,
    handleDeleteAccount
  } = useGeneralSettings();

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alertMessage && (
        <Alert
          variant={alertMessage.variant === "destructive" ? "destructive" : "default"}
          className="border-border/80 relative flex items-start gap-3 rounded-xl border pe-10">
          {alertMessage.variant === "destructive" ? (
            <AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <div className="space-y-1">
            <AlertTitle className="font-semibold">{alertMessage.title}</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {alertMessage.description}
            </AlertDescription>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-muted-foreground hover:text-foreground absolute end-4 top-4 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      <Card className="overflow-hidden py-0">
        <CardContent className="divide-border/60 divide-y p-0">
          <div className="space-y-8 p-8">
            <div className="space-y-8">
              <div className="flex flex-col items-start justify-between gap-6 pt-2 md:flex-row md:items-center">
                <div className="space-y-1 md:max-w-md">
                  <h3 className="text-foreground text-sm font-medium">{t("avatar")}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{t("avatarDesc")}</p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <div
                    onClick={
                      isUploadingAvatar || isSavingProfile ? undefined : () => setCropperOpen(true)
                    }
                    className="group bg-muted border-border/60 hover:bg-muted/80 relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border transition-all">
                    {isUploadingAvatar ? (
                      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                    ) : avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="User Avatar"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <Avatar className="h-full w-full rounded-full">
                        <AvatarFallback className="bg-primary/5 text-primary flex items-center justify-center text-xl font-bold">
                          <UserIcon className="text-muted-foreground h-8 w-8" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {!isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start justify-between gap-4 pt-6 md:flex-row">
                <div className="md:max-w-md">
                  <h3 className="text-foreground text-sm font-medium">{t("name")}</h3>
                </div>
                <div className="w-full md:max-w-xl">
                  <Input
                    type="text"
                    required
                    disabled={isSavingProfile}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="border-border/80 h-10 w-full focus-visible:ring-1"
                  />
                </div>
              </div>

              <div className="flex flex-col items-start justify-between gap-4 pt-6 lg:flex-row">
                <div className="space-y-1 md:max-w-md">
                  <h3 className="text-foreground text-sm font-medium">{t("description")}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t("descriptionDesc")}
                  </p>
                </div>
                <div className="w-full space-y-4 lg:max-w-xl">
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("descriptionDesc")}
                    disabled={isSavingProfile}
                    className="border-border/80 focus-visible:ring-1"
                  />
                  <div className="space-y-1">
                    <label className="text-foreground text-xs font-medium">{t("phone")}</label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("phoneDesc")}
                      disabled={isSavingProfile}
                      className="border-border/80 h-10 w-full focus-visible:ring-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start justify-between gap-4 pt-6 lg:flex-row">
                <div className="space-y-1 md:max-w-md">
                  <h3 className="text-foreground text-sm font-medium">Alamat</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Konfigurasi alamat Anda disesuaikan secara dinamis untuk pencetakan faktur dan
                    pelaporan pajak regional.
                  </p>
                </div>
                <div className="w-full lg:max-w-xl">
                  <AddressForm
                    locale={uiLocale}
                    data={address}
                    errors={addressErrors}
                    onChange={handleAddressChange}
                    onCountryDefaults={(d) => {
                      if (d.locale && localLanguage === "en") setLocalLanguage(d.locale);
                      if (d.timezone && (timezone === "UTC" || !timezone)) setTimezone(d.timezone);
                    }}
                    disabled={isSavingProfile}
                  />
                </div>
              </div>
            </div>

            <div className="border-border/40 flex justify-end pt-6">
              <Button
                onClick={handleSaveProfile}
                disabled={isSavingProfile || !fullName.trim()}
                variant="secondary"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1.5 rounded-lg px-5 text-xs">
                {isSavingProfile && <Loader2 className="h-3 w-3 animate-spin" />}
                {tCommon("save")}
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="space-y-1 md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">{t("email")}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{t("emailDesc")}</p>
              </div>
              <div className="w-full md:max-w-xl">
                <Input
                  type="email"
                  required
                  disabled={isSavingEmail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-border/80 h-10 w-full focus-visible:ring-1"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveEmail}
                disabled={isSavingEmail || !email.trim()}
                variant="secondary"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1.5 rounded-lg px-5 text-xs">
                {isSavingEmail && <Loader2 className="h-3 w-3 animate-spin" />}
                {tCommon("save")}
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="space-y-1 md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">
                  {t("language")} (Email & Notifications)
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{t("languageDesc")}</p>
              </div>
              <div className="w-full md:max-w-xl">
                <Select
                  value={localLanguage}
                  onValueChange={(val: string) => setLocalLanguage(val)}
                  disabled={isSavingLang}>
                  <SelectTrigger className="border-border/80 h-10 w-full focus:ring-1">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLocales.map((loc) => (
                      <SelectItem key={loc.code} value={loc.code}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveLanguage}
                disabled={isSavingLang}
                variant="secondary"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1.5 rounded-lg px-5 text-xs">
                {isSavingLang && <Loader2 className="h-3 w-3 animate-spin" />}
                {tCommon("save")}
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="space-y-1 md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">Timezone Settings</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Choose your local timezone to sync tasks, scheduling, and updates.
                </p>
              </div>
              <div className="w-full md:max-w-xl">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      disabled={isSavingTz}>
                      {timezone
                        ? supportedTimezones.find((tz) => tz.value === timezone)?.label
                        : "Select timezone..."}
                      <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search timezone..." />
                      <CommandList>
                        <CommandEmpty>No timezone found.</CommandEmpty>
                        <CommandGroup>
                          {supportedTimezones.map((tz) => (
                            <CommandItem
                              key={tz.value}
                              value={tz.value}
                              onSelect={(currentValue) => setTimezone(currentValue)}>
                              <Check
                                className={cn(
                                  "me-2 h-4 w-4",
                                  timezone === tz.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {tz.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveTimezone}
                disabled={isSavingTz}
                variant="secondary"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1.5 rounded-lg px-5 text-xs">
                {isSavingTz && <Loader2 className="h-3 w-3 animate-spin" />}
                {tCommon("save")}
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="space-y-1 md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">
                  {t("currencyTitle") || "Display Currency"}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("currencyDesc") || "Choose your preferred currency for displaying prices."}
                </p>
              </div>
              <div className="w-full md:max-w-xl">
                <Select value={currency} onValueChange={setCurrency} disabled={isSavingCurrency}>
                  <SelectTrigger className="border-border/80 h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantConfig.supported.currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveCurrency}
                disabled={isSavingCurrency}
                variant="secondary"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1.5 rounded-lg px-5 text-xs">
                {isSavingCurrency && <Loader2 className="h-3 w-3 animate-spin" />}
                {tCommon("save")}
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-6 bg-red-50/10 p-8 md:flex-row md:items-center">
            <div className="space-y-1.5 md:max-w-xl">
              <h2 className="text-destructive text-base font-semibold">{t("delete")}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{t("deleteDesc")}</p>
            </div>
            <div className="flex shrink-0">
              <Button
                onClick={() => setIsConfirmOpen(true)}
                variant="destructive"
                className="h-auto rounded-full bg-red-700 px-6 py-2 text-sm font-medium text-white hover:bg-red-800">
                {t("deleteButton")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        confirmName={fullName || "account"}
        title={t("dialogTitle")}
        description={t("dialogDesc")}
        actionLabel={tCommon("delete")}
        loading={isDeleting}
        onConfirm={handleDeleteAccount}
      />

      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
