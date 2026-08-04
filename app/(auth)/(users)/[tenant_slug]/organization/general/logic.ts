"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PERMISSIONS, hasPermission, type PermissionName } from "@/modules/rbac/shared";
import { useLocale, useTranslations } from "next-intl";
import { tenantConfig } from "@/config/tenant"; // Pastikan path import ini sesuai
import { normalizeTenantUpdatePayload, updateTenantSchema } from "@/lib/validation/tenants";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { deleteOrganizationAction, updateSchoolCodeAction } from "./actions";

export interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export function useOrganizationGeneral() {
  const router = useRouter();
  const t = useTranslations("organization.organization-general");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");

  // --- 1. STATE BARU UNTUK KONTAK, PAJAK, ALAMAT & i18n ---
  const [businessEmail, setBusinessEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [desa, setDesa] = useState("");
  const [defaultLocale, setDefaultLocale] = useState(tenantConfig.defaults.locale);
  const [timezone, setTimezone] = useState(tenantConfig.defaults.timezone);
  const [currency, setCurrency] = useState(tenantConfig.defaults.currency);
  const [schoolCode, setSchoolCode] = useState("");
  const [isSavingSchoolCode, setIsSavingSchoolCode] = useState(false);

  // State permission pengguna aktif (RBAC)
  const [userPermissions, setUserPermissions] = useState<PermissionName[] | null>(null);

  // State untuk manajemen pemotongan gambar (Cropping)
  const [cropperOpen, setCropperOpen] = useState(false);

  // State loading & interaksi
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Ambil ID organisasi aktif dari localStorage saat halaman dimuat
  useEffect(() => {
    const orgId = localStorage.getItem("active_org_id");
    if (orgId) {
      setActiveOrgId(orgId);
      fetchOrgAndRoleDetails(orgId);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Ambil data detail organisasi & Hak Akses Role dari Supabase secara Paralel
  const fetchOrgAndRoleDetails = async (orgId: string) => {
    setIsLoading(true);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const [tenantRes, membershipRes] = await Promise.all([
        // --- 2. UPDATE SELECT QUERY UNTUK MENGAMBIL KOLOM BARU ---
        (await tenantRepository(supabase))
          .query()
          .select(
            "name, logo, description, website, address_line1, address_line2, city, state_province, postal_code, country_code, kecamatan, desa, business_email, phone_number, tax_id, default_locale, timezone, currency, school_code"
          )
          .eq("id", orgId)
          .single(),
        (await membershipRepository(supabase))
          .query()
          .select("roles(role_permissions(permissions(name)))")
          .eq("tenant_id", orgId)
          .eq("user_id", user.id)
          .maybeSingle()
      ]);

      if (tenantRes.error) throw tenantRes.error;

      if (tenantRes.data) {
        setOrgName(tenantRes.data.name);
        setLogoPreview((tenantRes.data as any).logo || null);
        setDescription((tenantRes.data as any).description || "");
        setWebsite((tenantRes.data as any).website || "");

        // --- 3. POPULATE DATA BARU KE DALAM STATE ---
        setBusinessEmail((tenantRes.data as any).business_email || "");
        setPhoneNumber((tenantRes.data as any).phone_number || "");
        setTaxId((tenantRes.data as any).tax_id || "");
        setAddressLine1((tenantRes.data as any).address_line1 || "");
        setAddressLine2((tenantRes.data as any).address_line2 || "");
        setCity((tenantRes.data as any).city || "");
        setStateProvince((tenantRes.data as any).state_province || "");
        setPostalCode((tenantRes.data as any).postal_code || "");
        setCountryCode((tenantRes.data as any).country_code || "");
        setKecamatan((tenantRes.data as any).kecamatan || "");
        setDesa((tenantRes.data as any).desa || "");
        setDefaultLocale((tenantRes.data as any).default_locale || tenantConfig.defaults.locale);
        setTimezone((tenantRes.data as any).timezone || tenantConfig.defaults.timezone);
        setCurrency((tenantRes.data as any).currency || tenantConfig.defaults.currency);
        setSchoolCode((tenantRes.data as any).school_code || "");
      }

      const mData = membershipRes.data as any;
      if (mData?.roles) {
        const perms = (mData.roles.role_permissions ?? [])
          .map((rp: any) => rp.permissions?.name)
          .filter((n: any): n is string => typeof n === "string") as PermissionName[];
        setUserPermissions(perms);
      } else {
        setUserPermissions(null);
      }
    } catch (error: any) {
      console.error("Error fetching org details & role:", error);
      setAlertMessage({
        title: "Error",
        description: t("alerts.errorLoad"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Tutup alert otomatis setelah 5 detik
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!activeOrgId) return;

    setIsUploadingLogo(true);
    setAlertMessage(null);

    try {
      const filePath = `organizations/${activeOrgId}/${Date.now()}.webp`;

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

      const { error: tenantError } = await (
        await tenantRepository(supabase)
      )
        .query()
        .update({ logo: publicUrl })
        .eq("id", activeOrgId);

      if (tenantError) throw tenantError;

      setLogoPreview(publicUrl);
      window.dispatchEvent(new Event("storage")); // Refresh Sidebar Icon

      setAlertMessage({
        title: locale === "en" ? "Success" : "Sukses",
        description: t("alerts.successLogo"),
        variant: "default"
      });
    } catch (error: any) {
      console.error("Gagal mengunggah logo:", error);
      setAlertMessage({
        title: "Upload Failed",
        description: error.message || "Gagal mengunggah logo organisasi.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveName = async () => {
    if (!activeOrgId) return;
    setIsSaving(true);
    setAlertMessage(null);

    try {
      const { error } = await (
        await tenantRepository(supabase)
      )
        .query()
        .update({ name: orgName.trim() })
        .eq("id", activeOrgId);

      if (error) throw error;

      setAlertMessage({
        title: locale === "en" ? "Success" : "Sukses",
        description: t("alerts.successName"),
        variant: "default"
      });

      window.dispatchEvent(new Event("storage"));
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message || "Gagal memperbarui nama organisasi.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- 4. FUNGSI BARU UNTUK MENYIMPAN PENGATURAN SPESIFIK ---
  const handleSaveAdditionalDetails = async () => {
    if (!activeOrgId) return;
    setIsSaving(true);
    setAlertMessage(null);

    try {
      const updatePayload: Record<string, any> = {};

      updatePayload.description = description.trim() || null;
      updatePayload.website = website.trim() || null;

      if (tenantConfig.features.enableRegionalSettings) {
        updatePayload.default_locale = defaultLocale;
        updatePayload.timezone = timezone;
        updatePayload.currency = currency;
      }

      if (tenantConfig.features.enableBusinessContact) {
        updatePayload.business_email = businessEmail.trim() || null;
        updatePayload.phone_number = phoneNumber.trim() || null;
      }

      if (tenantConfig.features.enableTaxId) {
        updatePayload.tax_id = taxId.trim() || null;
      }

      if (tenantConfig.features.enableAddress) {
        updatePayload.address_line1 = addressLine1.trim() || null;
        updatePayload.address_line2 = addressLine2.trim() || null;
        updatePayload.city = city.trim() || null;
        updatePayload.state_province = stateProvince.trim() || null;
        updatePayload.postal_code = postalCode.trim() || null;
        updatePayload.country_code = countryCode || null;
        updatePayload.kecamatan = kecamatan.trim() || null;
        updatePayload.desa = desa.trim() || null;
      }

      const normalizedPayload = normalizeTenantUpdatePayload(updatePayload);

      // Validasi via zod sebelum tulis ke DB
      const parsed = updateTenantSchema.safeParse(normalizedPayload);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Validasi gagal.");
      }

      const { error } = await (
        await tenantRepository(supabase)
      )
        .query()
        .update(normalizedPayload)
        .eq("id", activeOrgId);

      if (error) throw error;

      setAlertMessage({
        title: locale === "en" ? "Success" : "Sukses",
        description:
          locale === "en" ? "Settings updated successfully." : "Pengaturan berhasil diperbarui.",
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message || "Gagal memperbarui pengaturan organisasi.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSchoolCode = async () => {
    if (!activeOrgId) return;
    setIsSavingSchoolCode(true);
    setAlertMessage(null);

    try {
      const res = await updateSchoolCodeAction(activeOrgId, schoolCode);
      if (res.error) throw new Error(res.error);

      setAlertMessage({
        title: locale === "en" ? "Success" : "Sukses",
        description:
          locale === "en"
            ? "School code saved successfully."
            : "Kode Sekolah berhasil disimpan.",
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message || "Gagal memperbarui Kode Sekolah.",
        variant: "destructive"
      });
    } finally {
      setIsSavingSchoolCode(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!activeOrgId) return;
    setIsDeleting(true);
    setAlertMessage(null);

    try {
      const res = await deleteOrganizationAction(activeOrgId);
      if (res.error) throw new Error(res.error);

      localStorage.removeItem("active_org_id");

      setAlertMessage({
        title: locale === "en" ? "Success" : "Sukses",
        description: t("alerts.successDelete"),
        variant: "default"
      });

      setTimeout(() => {
        window.location.assign("/");
      }, 1200);
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message || "Gagal menghapus organisasi.",
        variant: "destructive"
      });
      setIsDeleting(false);
    }
  };

  // Read-only jika pengguna tidak punya permission organization.update
  const isReadOnly = !hasPermission(userPermissions, PERMISSIONS.organizationUpdate);
  // Hapus organisasi hanya utk pemegang organization.delete (Owner).
  const canDeleteOrg = hasPermission(userPermissions, PERMISSIONS.organizationDelete);

  // --- 5. PASTIKAN SEMUA STATE DAN FUNGSI BARU DIKEMBALIKAN ---
  return {
    t,
    tCommon,
    locale,
    activeOrgId,
    orgName,
    setOrgName,
    logoPreview,
    cropperOpen,
    setCropperOpen,
    isLoading,
    isUploadingLogo,
    isSaving,
    isDeleting,
    alertMessage,
    setAlertMessage,
    isConfirmOpen,
    setIsConfirmOpen,
    handleCropComplete,
    handleSaveName,
    handleDeleteOrganization,
    isReadOnly,
    canDeleteOrg,
    description,
    setDescription,
    website,
    setWebsite,

    schoolCode,
    setSchoolCode,
    isSavingSchoolCode,
    handleSaveSchoolCode,

    businessEmail,
    setBusinessEmail,
    phoneNumber,
    setPhoneNumber,
    taxId,
    setTaxId,
    addressLine1,
    setAddressLine1,
    addressLine2,
    setAddressLine2,
    city,
    setCity,
    stateProvince,
    setStateProvince,
    postalCode,
    setPostalCode,
    countryCode,
    setCountryCode,
    kecamatan,
    setKecamatan,
    desa,
    setDesa,
    defaultLocale,
    setDefaultLocale,
    timezone,
    setTimezone,
    currency,
    setCurrency,
    handleSaveAdditionalDetails
  };
}
