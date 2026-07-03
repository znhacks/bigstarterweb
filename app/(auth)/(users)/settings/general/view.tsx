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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
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

// Impor utilitas eksternal (mengatasi error 'cn' dan 'supportedTimezones')
import { cn } from "@/lib/utils";
import { getAllTimezones } from "@/lib/timezones";

// Impor klien Supabase dan REUSABLE IMAGE CROPPER
import { supabase } from "@/lib/supabase";
import { useTranslations } from "next-intl";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

// Daftar bahasa komunikasi yang didukung sistem (untuk Email, Invoice, dll)
const supportedLocales = [
  { code: "en", label: "English" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ar", label: "العربية" }
] as const;

// Memuat daftar seluruh zona waktu dunia secara otomatis
const supportedTimezones = getAllTimezones();

export function AccountGeneralSettings() {
  const router = useRouter();

  // Integrasi next-intl untuk UI umum
  const t = useTranslations("account-general");
  const tCommon = useTranslations("common");

  // State Bahasa Komunikasi (Diambil dari Supabase Profiles)
  const [localLanguage, setLocalLanguage] = useState<string>("en");
  const [isSavingLang, setIsSavingLang] = useState(false);

  // State Zona Waktu (Diambil dari Supabase Profiles)
  const [timezone, setTimezone] = useState<string>("UTC");
  const [isSavingTz, setIsSavingTz] = useState(false);

  // State Data User & Profil
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // State Manajemen Pemotongan Gambar (Cropping)
  const [cropperOpen, setCropperOpen] = useState(false);

  // State loading & interaksi
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Mengambil data pengguna & profil saat halaman dimuat
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

        // MENGAMBIL DATA PROFIL TERMASUK PREFERRED_LANGUAGE & TIMEZONE DARI DATABASE
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, avatar, preferred_language, timezone") // Ambil kolom timezone di sini
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          setFullName(profileData.full_name || "");
          setAvatarUrl(profileData.avatar || null);
          setLocalLanguage(profileData.preferred_language || "en");
          setTimezone(profileData.timezone || "UTC"); // Set state timezone
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

  // Tutup alert otomatis setelah 5 detik
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // PROSES UPLOAD FOTO PROFIL KE SUPABASE
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

  // MENYIMPAN BAHASA KOMUNIKASI/EMAIL KE SUPABASE (DATABASE)
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

  // MENYIMPAN ZONA WAKTU PILIHAN KE SUPABASE (DATABASE)
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

  // Menyimpan nama lengkap ke tabel 'profiles'
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
        description: tCommon("success"),
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

  // Menyimpan perubahan email
  const handleSaveEmail = async () => {
    setIsSavingEmail(true);
    setAlertMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });

      if (error) throw error;

      setAlertMessage({
        title: tCommon("success"),
        description: "Email verification request initiated.",
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

  // Menghapus akun permanen
  const handleDeleteAccount = async () => {
    if (!userId) return;
    setIsDeleting(true);

    try {
      await supabase.from("profiles").delete().eq("id", userId);
      await supabase.auth.signOut();

      localStorage.removeItem("active_org_id");

      setTimeout(() => {
        router.push("/dashboard/login/v2");
        router.refresh();
      }, 1500);
    } catch (error: any) {
      setAlertMessage({
        title: tCommon("error"),
        description: error.message || "Failed to delete account.",
        variant: "destructive"
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      {/* Header Halaman */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subTitle")}</p>
      </div>

      {/* SHADCN ALERT NOTIFICATION */}
      {alertMessage && (
        <Alert
          variant={alertMessage.variant === "destructive" ? "destructive" : "default"}
          className="border-border/80 relative flex items-start gap-3 rounded-xl border pr-10">
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
            className="text-muted-foreground hover:text-foreground absolute top-4 right-4 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      <div className="space-y-6">
        {/* CARD 1: YOUR AVATAR */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
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
          </CardContent>
        </Card>

        {/* CARD 2: COMMUNICATION LANGUAGE */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col gap-6 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="space-y-1 md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">
                  {t("language")} (Email & Notifications)
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("languageDesc")} (Used for official emails, OTP, invoices, and system updates)
                </p>
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
          </CardContent>
        </Card>

        {/* CARD 3: TIMEZONE SETTINGS (Penanganan Zona Waktu Global) */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col gap-6 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="space-y-1 md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">Timezone Settings</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Choose your local timezone. This ensures tasks, scheduling, and notifications
                  match your actual local hours.
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
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                              key={tz.value} // Diperbaiki dari tz.code -> tz.value
                              value={tz.value} // Diperbaiki dari tz.code -> tz.value
                              onSelect={(currentValue) => {
                                setTimezone(currentValue);
                              }}>
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
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
          </CardContent>
        </Card>

        {/* CARD 4: YOUR NAME */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col gap-6 p-8">
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
          </CardContent>
        </Card>

        {/* CARD 5: YOUR EMAIL */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col gap-6 p-8">
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
          </CardContent>
        </Card>

        {/* CARD 6: DELETE ACCOUNT */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
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
          </CardContent>
        </Card>
      </div>

      {/* SHADCN DIALOG KONFIRMASI PENGHAPUSAN AKUN */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialogDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground inline-flex items-center gap-2">
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* REUSABLE IMAGE CROPPER DIALOG */}
      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
