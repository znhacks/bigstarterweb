"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { supabase } from "@/lib/supabase";
import { useTranslations, useLocale } from "next-intl";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { AddressForm, AddressData } from "@/components/ui/address-form";
import { getAddressConfig, LOCALES, LOCALE_META } from "@/config/i18n-culture";
import { Textarea } from "@/components/ui/textarea";
import { updateProfileSchema } from "@/lib/validation/profiles";

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

// Daftar bahasa dari single source of truth (LOCALES i18n)
const supportedLocales = LOCALES.map((code) => ({ code, label: LOCALE_META[code].label }));

const supportedTimezones = getAllTimezones();

export function GeneralSettingsPage() {
  const router = useRouter();
  const t = useTranslations("settings.account-general");
  const tCommon = useTranslations("common");
  // Bahasa SISTEM (UI) — form alamat & validasi ikut ini, BUKAN preferensi user
  const uiLocale = useLocale();

  const [isLoading, setIsLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);

  // States
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localLanguage, setLocalLanguage] = useState<string>("en");
  const [timezone, setTimezone] = useState<string>("UTC");
  const [description, setDescription] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // Interaksi Loading States
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingLang, setIsSavingLang] = useState(false);
  const [isSavingTz, setIsSavingTz] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);

  const [address, setAddress] = useState<AddressData>({
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "US",
    kecamatan: "",
    desa: ""
  });
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof AddressData, string>>>({});
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  useEffect(() => {
    const loadAccountData = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser();
        if (userError || !user) {
          router.push("/login");
          return;
        }

        setUserId(user.id);
        setEmail(user.email || "");

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "full_name, avatar, preferred_language, timezone, description, phone, address_line1, address_line2, address_city, address_region, address_postal_code, address_country, address_kecamatan, address_desa"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          setFullName(profileData.full_name || "");
          setAvatarUrl(profileData.avatar || null);
          setLocalLanguage(profileData.preferred_language || "en");
          setTimezone(profileData.timezone || "UTC");
          setDescription(profileData.description || "");
          setPhone(profileData.phone || "");

          // Sinkronkan alamat dari database ke local state
          setAddress({
            line1: profileData.address_line1 || "",
            line2: profileData.address_line2 || "",
            city: profileData.address_city || "",
            region: profileData.address_region || "",
            postalCode: profileData.address_postal_code || "",
            country: profileData.address_country || "US",
            kecamatan: profileData.address_kecamatan || "",
            desa: profileData.address_desa || ""
          });
        }
      } catch (error: any) {
        console.error("Gagal memuat data akun:", error);
        setAlertMessage({
          title: "Error",
          description: "Error loading profile data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAccountData();
  }, [router]);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const handleAddressChange = (field: keyof AddressData, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (addressErrors[field]) {
      setAddressErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSaveAddress = async () => {
    if (!userId) return;
    setAddressErrors({});
    setAlertMessage(null);

    // Jalankan validasi dinamis berdasarkan locale SISTEM (UI), bukan preferensi user
    const config = getAddressConfig(uiLocale);
    const errors: Partial<Record<keyof AddressData, string>> = {};

    // 1. Validasi Kolom Wajib
    config.required.forEach((field) => {
      if (!address[field]?.trim()) {
        errors[field] = "Kolom ini wajib diisi.";
      }
    });

    // 2. Validasi Struktur Regex Kode Pos sesuai Negara
    if (address.postalCode && config.postalPattern) {
      const regex = new RegExp(config.postalPattern);
      if (!regex.test(address.postalCode.trim())) {
        errors.postalCode = `Format kode pos tidak valid (Contoh: ${config.postalPlaceholder}).`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setAddressErrors(errors);
      setAlertMessage({
        title: tCommon("error"),
        description: "Harap perbaiki kesalahan pada kolom alamat.",
        variant: "destructive"
      });
      return;
    }

    setIsSavingAddress(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          address_line1: address.line1.trim(),
          address_line2: address.line2.trim(),
          address_city: address.city.trim(),
          address_region: address.region.trim(),
          address_postal_code: address.postalCode.trim(),
          address_country: address.country,
          address_kecamatan: address.kecamatan?.trim() || null,
          address_desa: address.desa?.trim() || null
        })
        .eq("id", userId);

      if (error) throw error;

      setAlertMessage({
        title: tCommon("success"),
        description: "Alamat penagihan berhasil diperbarui.",
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: tCommon("error"),
        description: error.message || tCommon("error"),
        variant: "destructive"
      });
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSaveBio = async () => {
    if (!userId) return;
    setAlertMessage(null);

    // Validasi via zod
    const parsed = updateProfileSchema.safeParse({ description, phone });
    if (!parsed.success) {
      setAlertMessage({
        title: tCommon("error"),
        description: parsed.error.issues[0]?.message || tCommon("error"),
        variant: "destructive"
      });
      return;
    }

    setIsSavingBio(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          description: description.trim() || null,
          phone: phone.trim() || null
        })
        .eq("id", userId);

      if (error) throw error;

      setAlertMessage({
        title: tCommon("success"),
        description: "Bio & telepon berhasil diperbarui.",
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: tCommon("error"),
        description: error.message || tCommon("error"),
        variant: "destructive"
      });
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!userId) return;
    setIsUploadingAvatar(true);
    setAlertMessage(null);

    try {
      const filePath = `users/${userId}/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: true
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl }
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar: publicUrl })
        .eq("id", userId);

      if (profileError) throw profileError;

      setAvatarUrl(publicUrl);
      setAlertMessage({
        title: "Success",
        description: "Foto profil Anda berhasil diperbarui.",
        variant: "default"
      });
    } catch (error: any) {
      console.error("Gagal mengunggah avatar:", error);
      setAlertMessage({
        title: "Upload Failed",
        description: error.message || "Gagal mengunggah foto profil.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveLanguage = async () => {
    if (!userId) return;
    setIsSavingLang(true);
    setAlertMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ preferred_language: localLanguage })
        .eq("id", userId);

      if (error) throw error;

      setAlertMessage({
        title: tCommon("success"),
        description: "Preferensi bahasa komunikasi berhasil diperbarui.",
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: tCommon("error"),
        description: error.message || tCommon("error"),
        variant: "destructive"
      });
    } finally {
      setIsSavingLang(false);
    }
  };

  const handleSaveTimezone = async () => {
    if (!userId) return;
    setIsSavingTz(true);
    setAlertMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ timezone: timezone })
        .eq("id", userId);

      if (error) throw error;

      document.cookie = `user-timezone=${timezone};path=/;max-age=31536000;SameSite=Lax`;

      setAlertMessage({
        title: tCommon("success"),
        description: "Preferensi zona waktu berhasil diperbarui.",
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: tCommon("error"),
        description: error.message || tCommon("error"),
        variant: "destructive"
      });
    } finally {
      setIsSavingTz(false);
    }
  };

  const handleSaveName = async () => {
    if (!userId) return;
    setIsSavingName(true);
    setAlertMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", userId);

      if (error) throw error;

      setAlertMessage({
        title: tCommon("success"),
        description: "Nama lengkap berhasil diperbarui.",
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: tCommon("error"),
        description: error.message || tCommon("error"),
        variant: "destructive"
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveEmail = async () => {
    setIsSavingEmail(true);
    setAlertMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;

      setAlertMessage({
        title: tCommon("success"),
        description: "Permintaan verifikasi email berhasil dikirim.",
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: tCommon("error"),
        description: error.message || tCommon("error"),
        variant: "destructive"
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    setIsDeleting(true);

    try {
      // Soft-delete: tandai deleted_at + status, bukan hard-delete.
      const { error } = await supabase
        .from("profiles")
        .update({ status: "deleted", deleted_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;

      await supabase.auth.signOut();
      localStorage.removeItem("active_org_id");

      setTimeout(() => {
        router.push("/login?reason=deleted");
        router.refresh();
      }, 600);
    } catch (error: any) {
      setAlertMessage({
        title: tCommon("error"),
        description: error.message || "Gagal menghapus akun.",
        variant: "destructive"
      });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* KONSOLIDASI: SATU CARD TUNGGAL UNTUK SEMUA FORM GENERAL */}
      <Card className="overflow-hidden">
        <CardContent className="divide-border/60 divide-y p-0">
          {/* Section 1: Avatar */}
          <div className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
            <div className="space-y-1 md:max-w-md">
              <h2 className="text-foreground text-base font-semibold">{t("avatar")}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{t("avatarDesc")}</p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <div
                onClick={isUploadingAvatar || isSavingLang ? undefined : () => setCropperOpen(true)}
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

          {/* Section 2: Full Name */}
          <div className="space-y-4 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">{t("name")}</h2>
              </div>
              <div className="w-full md:max-w-xl">
                <Input
                  type="text"
                  required
                  disabled={isSavingName}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border-border/80 h-10 w-full focus-visible:ring-1"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveName}
                disabled={isSavingName || !fullName.trim()}
                variant="secondary"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1.5 rounded-lg px-5 text-xs">
                {isSavingName && <Loader2 className="h-3 w-3 animate-spin" />}
                {tCommon("save")}
              </Button>
            </div>
          </div>

          {/* Section 3: Email */}
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

          {/* Section 3b: Bio & Phone */}
          <div className="space-y-4 p-8">
            <div className="space-y-1 md:max-w-md">
              <h2 className="text-foreground text-base font-semibold">{t("description")}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{t("descriptionDesc")}</p>
            </div>
            <div className="w-full space-y-4">
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionDesc")}
                disabled={isSavingBio}
                className="border-border/80 focus-visible:ring-1"
              />
              <div className="space-y-1">
                <label className="text-foreground text-sm font-medium">{t("phone")}</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("phoneDesc")}
                  disabled={isSavingBio}
                  className="border-border/80 h-10 w-full focus-visible:ring-1"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveBio}
                disabled={isSavingBio}
                variant="secondary"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1.5 rounded-lg px-5 text-xs">
                {isSavingBio && <Loader2 className="h-3 w-3 animate-spin" />}
                {tCommon("save")}
              </Button>
            </div>
          </div>

          {/* Section 4: Communication Language */}
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

          {/* Section 5: Timezone Settings */}
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

          {/* Section 6: Dynamic Billing Address Form */}
          <div className="space-y-6 p-8">
            <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
              <div className="space-y-1 md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">
                  Alamat
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
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
                    // Suggest-if-empty: hanya isi bila masih default (tidak menimpa pilihan user)
                    if (d.locale && localLanguage === "en") setLocalLanguage(d.locale);
                    if (d.timezone && (timezone === "UTC" || !timezone)) setTimezone(d.timezone);
                  }}
                  disabled={isSavingAddress}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveAddress}
                disabled={isSavingAddress}
                variant="secondary"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1.5 rounded-lg px-5 text-xs">
                {isSavingAddress && <Loader2 className="h-3 w-3 animate-spin" />}
                {tCommon("save")}
              </Button>
            </div>
          </div>

          {/* Section 6: Delete Account (Danger Zone) */}
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
