"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PERMISSIONS, hasPermission, type PermissionName } from "@/modules/rbac/shared";
import { useLocale, useTranslations } from "next-intl";
import { tenantConfig } from "@/config/tenant"; // Pastikan path import ini sesuai
import { normalizeTenantUpdatePayload, updateTenantSchema } from "@/lib/validation/tenants";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { deleteOrganizationAction, updateSchoolCodeAction } from "./actions";

import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { uploadOrganizationLogoAction } from "@/app/actions/upload";

export interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export function useOrganizationGeneral() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = (params as any)?.tenant_slug as string | undefined;

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
  const [isPaidPlan, setIsPaidPlan] = useState(false);
  const [maxSchoolSlots, setMaxSchoolSlots] = useState(2);
  const [schoolCodesList, setSchoolCodesList] = useState<string[]>(["", ""]);

  // State permission pengguna aktif (RBAC)
  const [userPermissions, setUserPermissions] = useState<PermissionName[] | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);

  // State untuk manajemen pemotongan gambar (Cropping)
  const [cropperOpen, setCropperOpen] = useState(false);

  // State loading & interaksi
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Resolusi ID organisasi dari parameter URL (tenantSlug) atau localStorage
  useEffect(() => {
    async function resolveAndFetch() {
      setIsLoading(true);
      const pathSlug = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "";
      const queryKey = tenantSlug || pathSlug || localStorage.getItem("active_org_id") || "jurnal-mengajar";
      fetchOrgAndRoleDetails(queryKey);
    }
    resolveAndFetch();
  }, [tenantSlug]);

  // Ambil data detail organisasi & Hak Akses Role dari Server Action
  const fetchOrgAndRoleDetails = async (orgIdOrSlug: string) => {
    setIsLoading(true);
    try {
      const { getOrganizationDetailsAction } = await import("./actions");
      const res = await getOrganizationDetailsAction(orgIdOrSlug);

      if (res.error || !res.tenant) {
        throw new Error(res.error || "Gagal memuat data organisasi.");
      }

      if (res.tenant.id) {
        setActiveOrgId(res.tenant.id);
        localStorage.setItem("active_org_id", res.tenant.id);
        document.cookie = `active_tenant_id=${res.tenant.id}; path=/; max-age=2592000; SameSite=Lax;`;
      }

      setIsSuperadmin(!!res.isSuperadmin);
      setIsOwnerOrAdmin(!!res.isOwnerOrAdmin);
      setUserPermissions((res.permissions as PermissionName[]) || null);

      const isPaid = !!res.isPaid;
      setIsPaidPlan(isPaid);
      const slotsCount = isPaid ? 3 : 2;
      setMaxSchoolSlots(slotsCount);

      const tenant = res.tenant;
      setOrgName(tenant.name || "");
      setLogoPreview(tenant.logo || null);
      setDescription(tenant.description || "");
      setWebsite(tenant.website || "");

      // Populate data detail
      setBusinessEmail(tenant.business_email || "");
      setPhoneNumber(tenant.phone_number || "");
      setTaxId(tenant.tax_id || "");
      setAddressLine1(tenant.address_line1 || "");
      setAddressLine2(tenant.address_line2 || "");
      setCity(tenant.city || "");
      setStateProvince(tenant.state_province || "");
      setPostalCode(tenant.postal_code || "");
      setCountryCode(tenant.country_code || "");
      setKecamatan(tenant.kecamatan || "");
      setDesa(tenant.desa || "");
      setDefaultLocale(tenant.default_locale || tenantConfig.defaults.locale);
      setTimezone(tenant.timezone || tenantConfig.defaults.timezone);
      setCurrency(tenant.currency || tenantConfig.defaults.currency);
      
      const rawCodeStr = tenant.school_code || "";
      setSchoolCode(rawCodeStr);
      const parsedCodes = rawCodeStr.split(",").map((s: string) => s.trim());
      const filledSlots = Array.from({ length: slotsCount }, (_, i) => parsedCodes[i] || "");
      setSchoolCodesList(filledSlots);
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

  const handleSchoolCodeChange = (index: number, val: string) => {
    setSchoolCodesList((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
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
      const formData = new FormData();
      const file = new File([croppedBlob], `logo-${Date.now()}.webp`, {
        type: "image/webp"
      });
      formData.append("tenantId", activeOrgId);
      formData.append("file", file);

      const res = await uploadOrganizationLogoAction(formData);

      if (res.error || !res.publicUrl) {
        throw new Error(res.error || "Gagal mengunggah logo organisasi.");
      }

      setLogoPreview(res.publicUrl);
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
      const trimmedCodes = schoolCodesList.map((c) => c.trim());
      const hasAnyCode = trimmedCodes.some(Boolean);
      const combinedCode = hasAnyCode ? trimmedCodes.join(", ") : "";

      const res = await updateSchoolCodeAction(activeOrgId, combinedCode);
      if (res.error) throw new Error(res.error);

      setSchoolCode(combinedCode);
      const parsedCodes = combinedCode.split(",").map((s) => s.trim());
      const filledSlots = Array.from({ length: maxSchoolSlots }, (_, i) => parsedCodes[i] || "");
      setSchoolCodesList(filledSlots);

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

  // Read-only hanya jika BUKAN Superadmin/Owner dan permission organization.update tidak ada
  const isReadOnly = !isSuperadmin && !isOwnerOrAdmin && userPermissions !== null && !hasPermission(userPermissions, PERMISSIONS.organizationUpdate);
  // Hapus organisasi hanya utk Superadmin atau Owner
  const canDeleteOrg = isSuperadmin || isOwnerOrAdmin || hasPermission(userPermissions, PERMISSIONS.organizationDelete);

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
    schoolCodesList,
    handleSchoolCodeChange,
    isPaidPlan,
    maxSchoolSlots,
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
