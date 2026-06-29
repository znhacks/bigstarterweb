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
  ShieldAlert
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

// Impor klien Supabase, Global Language Hook, dan REUSABLE IMAGE CROPPER DIALOG
import { supabase } from "@/lib/supabase";
import { useLanguage, LanguageType, dictionaries } from "@/components/providers/language-provider";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export default function AccountGeneralSettings() {
  const router = useRouter();

  // Menggunakan global state bahasa
  const { language, setLanguage, t } = useLanguage();

  const [localLanguage, setLocalLanguage] = useState<LanguageType>(language);

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
  const [isSavingLang, setIsSavingLang] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    setLocalLanguage(language);
  }, [language]);

  useEffect(() => {
    const loadAccountData = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser();
        if (userError || !user) {
          router.push("/dashboard/login/v2");
          return;
        }

        setUserId(user.id);
        setEmail(user.email || "");

        // MENGAMBIL AVATAR & NAMA LENGKAP NYATA DARI TABEL PROFILES
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, avatar")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          setFullName(profileData.full_name || "");
          setAvatarUrl(profileData.avatar || null); // Mengisi preview dengan URL avatar asli dari DB
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

  // PROSES UPLOAD REAL BERKAS WEBP HASIL POTONGAN KE SUPABASE STORAGE & DATABASE PROFILES
  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!userId) return;

    setIsUploadingAvatar(true);
    setAlertMessage(null);

    try {
      // Menggunakan ekstensi berkas .webp hasil konversi canvas
      const filePath = `users/${userId}/${Date.now()}.webp`;

      // A. Unggah berkas webp terkompresi ke Supabase Storage (Bucket 'avatars')
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // B. Dapatkan Public URL hasil upload gambar
      const {
        data: { publicUrl }
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // C. Simpan tautan URL gambar tersebut ke kolom "avatar" di tabel "profiles"
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar: publicUrl })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Update state preview di layar secara instan
      setAvatarUrl(publicUrl);
      setAlertMessage({
        title: "Success",
        description: "Foto profil Anda berhasil diperbarui di database.",
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

  // Menyimpan perubahan bahasa ke Global Context
  const handleSaveLanguage = async () => {
    setIsSavingLang(true);
    try {
      await setLanguage(localLanguage); // Menyimpan secara global
      setAlertMessage({
        title:
          localLanguage === "English"
            ? "Language Updated"
            : localLanguage === "Español"
              ? "Idioma Actualizado"
              : "Bahasa Diperbarui",
        description: t.common.success,
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message || "Gagal memperbarui preferensi bahasa.",
        variant: "destructive"
      });
    } finally {
      setIsSavingLang(false);
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
        title: t.common.success,
        description: t.common.success,
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: t.common.error,
        description: error.message || t.common.error,
        variant: "destructive"
      });
    } finally {
      setIsSavingName(false);
    }
  };

  // Menyimpan perubahan email (OTP Verifikasi)
  const handleSaveEmail = async () => {
    setIsSavingEmail(true);
    setAlertMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });

      if (error) throw error;

      setAlertMessage({
        title: t.common.success,
        description: "Email verification request initiated.",
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: t.common.error,
        description: error.message || t.common.error,
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
        title: t.common.error,
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
        <h1 className="text-3xl font-semibold tracking-tight">{t.accountSettings.title}</h1>
        <p className="text-muted-foreground text-sm">{t.accountSettings.subTitle}</p>
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
              <h2 className="text-foreground text-base font-semibold">
                {t.accountSettings.avatar}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t.accountSettings.avatarDesc}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              {/* INPUT FILE SUDAH DIHAPUS DARI SINI (KARENA SUDAH DIKELOLA INTERNALLY DI DALAM DIALOG DIBAWAH) */}
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

        {/* CARD 2: YOUR LANGUAGE */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col gap-6 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="space-y-1 md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">
                  {t.accountSettings.language}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t.accountSettings.languageDesc}
                </p>
              </div>
              <div className="w-full md:max-w-xl">
                <Select
                  value={localLanguage}
                  onValueChange={(val: LanguageType) => setLocalLanguage(val)}
                  disabled={isSavingLang}>
                  <SelectTrigger className="border-border/80 h-10 w-full focus:ring-1">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(dictionaries).map((langName) => (
                      <SelectItem key={langName} value={langName}>
                        {langName}
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
                {t.common.save}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: YOUR NAME */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col gap-6 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">
                  {t.accountSettings.name}
                </h2>
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
                {t.common.save}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: YOUR EMAIL */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col gap-6 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="space-y-1 md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">
                  {t.accountSettings.email}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t.accountSettings.emailDesc}
                </p>
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
                {t.common.save}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 5: DELETE ACCOUNT */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
            <div className="space-y-1.5 md:max-w-xl">
              <h2 className="text-destructive text-base font-semibold">
                {t.accountSettings.delete}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t.accountSettings.deleteDesc}
              </p>
            </div>

            <div className="flex shrink-0">
              <Button
                onClick={() => setIsConfirmOpen(true)}
                variant="destructive"
                className="h-auto rounded-full bg-red-700 px-6 py-2 text-sm font-medium text-white hover:bg-red-800">
                {t.accountSettings.deleteButton}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SHADCN DIALOG KONFIRMASI PENGHAPUSAN AKUN */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.accountSettings.dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.accountSettings.dialogDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground inline-flex items-center gap-2">
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* REUSABLE IMAGE CROPPER DIALOG (Bawaan drag and drop & tab input URL) */}
      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
