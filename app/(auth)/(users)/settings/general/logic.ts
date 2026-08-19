// logic.ts
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTranslations, useLocale } from "next-intl";
import { AddressData } from "@/components/ui/address-form";
import { getAddressConfig } from "@/config/i18n-culture";
import { updateProfileSchema } from "@/lib/validation/profiles";
import { profileRepository } from "@/supabase/repositories/profiles";
import { uploadUserAvatarAction } from "@/app/actions/upload";

export interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export function useGeneralSettings() {
  const router = useRouter();
  const t = useTranslations("settings.account-general");
  const tCommon = useTranslations("common");
  const uiLocale = useLocale();

  const [isLoading, setIsLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);

  // States data profil
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localLanguage, setLocalLanguage] = useState<string>("en");
  const [timezone, setTimezone] = useState<string>("UTC");
  const [currency, setCurrency] = useState<string>("IDR");
  const [description, setDescription] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // States interaksi / loading
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingLang, setIsSavingLang] = useState(false);
  const [isSavingTz, setIsSavingTz] = useState(false);
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);

  // States alamat
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
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof AddressData, string>>>(
    {}
  );

  // Load data profil dari Supabase
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

        const { data: profileData, error: profileError } = await (await profileRepository(supabase))
          .query()
          .select(
            "full_name, avatar, preferred_language, timezone, description, phone, currency, address_line1, address_line2, address_city, address_region, address_postal_code, address_country, address_kecamatan, address_desa"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          setFullName(profileData.full_name || "");
          setAvatarUrl(profileData.avatar || null);
          setLocalLanguage(profileData.preferred_language || "en");
          setTimezone(profileData.timezone || "UTC");
          setCurrency(profileData.currency || "IDR");
          setDescription(profileData.description || "");
          setPhone(profileData.phone || "");

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

  // Alert auto-dismiss setelah beberapa detik
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

  // Fungsi tunggal untuk menyimpan seluruh data Profil & Alamat
  const handleSaveProfile = async () => {
    if (!userId) return;
    setAddressErrors({});
    setAlertMessage(null);

    // 1. Validasi Nama
    if (!fullName.trim()) {
      setAlertMessage({
        title: tCommon("error"),
        description: "Nama lengkap wajib diisi.",
        variant: "destructive"
      });
      return;
    }

    // 2. Validasi Bio & Telepon via Zod Schema
    const parsedBio = updateProfileSchema.safeParse({ description, phone });
    if (!parsedBio.success) {
      setAlertMessage({
        title: tCommon("error"),
        description: parsedBio.error.issues[0]?.message || tCommon("error"),
        variant: "destructive"
      });
      return;
    }

    // 3. Validasi Alamat Dinamis
    const config = getAddressConfig(uiLocale);
    const errors: Partial<Record<keyof AddressData, string>> = {};

    config.required.forEach((field) => {
      if (!address[field]?.trim()) {
        errors[field] = "Kolom ini wajib diisi.";
      }
    });

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

    setIsSavingProfile(true);

    try {
      // Pembaruan satu kali jalan ke tabel profiles
      const { error } = await (await profileRepository(supabase))
        .query()
        .update({
          full_name: fullName.trim(),
          description: description.trim() || null,
          phone: phone.trim() || null,
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
        description: "Informasi profil dan alamat berhasil diperbarui.",
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: tCommon("error"),
        description: error.message || tCommon("error"),
        variant: "destructive"
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!userId) return;
    setIsUploadingAvatar(true);
    setAlertMessage(null);

    try {
      const formData = new FormData();
      const file = new File([croppedBlob], `avatar-${Date.now()}.webp`, {
        type: "image/webp"
      });
      formData.append("file", file);

      const res = await uploadUserAvatarAction(formData);

      if (res.error || !res.publicUrl) {
        throw new Error(res.error || "Gagal mengunggah foto profil.");
      }

      setAvatarUrl(res.publicUrl);
      window.dispatchEvent(new Event("storage"));
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
      const { error } = await (await profileRepository(supabase))
        .query()
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
      const { error } = await (await profileRepository(supabase))
        .query()
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

  const handleSaveCurrency = async () => {
    if (!userId) return;
    setIsSavingCurrency(true);
    setAlertMessage(null);

    try {
      const { error } = await (await profileRepository(supabase))
        .query()
        .update({ currency })
        .eq("id", userId);

      if (error) throw error;

      // Update cookie USER_CURRENCY agar display currency langsung berubah
      document.cookie = `USER_CURRENCY=${currency};path=/;max-age=31536000;SameSite=Lax`;

      setAlertMessage({
        title: tCommon("success"),
        description: "Preferensi mata uang berhasil diperbarui.",
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: tCommon("error"),
        description: error.message || tCommon("error"),
        variant: "destructive"
      });
    } finally {
      setIsSavingCurrency(false);
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
      const { error } = await (await profileRepository(supabase))
        .query()
        .update({ status: "deleted", deleted_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;

      // Catat log logout ke database sebelum sesi dihapus
      const { logoutAction } = await import("@/app/actions/auth");
      await logoutAction();

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

  return {
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
    setAddress,
    addressErrors,
    handleAddressChange,
    handleSaveProfile,
    handleCropComplete,
    handleSaveLanguage,
    handleSaveTimezone,
    handleSaveEmail,
    handleDeleteAccount
  };
}
