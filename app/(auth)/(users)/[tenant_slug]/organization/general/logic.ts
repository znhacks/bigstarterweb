"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PERMISSIONS, hasPermission, type PermissionName } from "@/lib/rbac";
import { useLocale, useTranslations } from "next-intl";

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
        router.push("/dashboard/login/v2");
        return;
      }

      const [tenantRes, membershipRes] = await Promise.all([
        supabase.from("tenants").select("name, logo").eq("id", orgId).single(),
        supabase
          .from("memberships")
          .select("roles(role_permissions(permissions(name)))")
          .eq("tenant_id", orgId)
          .eq("user_id", user.id)
          .maybeSingle()
      ]);

      if (tenantRes.error) throw tenantRes.error;
      if (tenantRes.data) {
        setOrgName(tenantRes.data.name);
        setLogoPreview((tenantRes.data as any).logo || null);
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

      const { error: tenantError } = await supabase
        .from("tenants")
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
      const { error } = await supabase
        .from("tenants")
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

  const handleDeleteOrganization = async () => {
    if (!activeOrgId) return;
    setIsDeleting(true);
    setAlertMessage(null);

    try {
      // Soft-delete: tandai tenant deleted. Data anak (memberships,
      // subscriptions, transactions, tasks) dipertahankan agar bisa direstore.
      const { error } = await supabase
        .from("tenants")
        .update({ status: "deleted", deleted_at: new Date().toISOString() })
        .eq("id", activeOrgId);

      if (error) throw error;

      localStorage.removeItem("active_org_id");

      setAlertMessage({
        title: locale === "en" ? "Success" : "Sukses",
        description: t("alerts.successDelete"),
        variant: "default"
      });

      setTimeout(() => {
        // Owner kehilangan akses ke org ini -> kembali ke root.
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

  return {
    t,
    tCommon,
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
    canDeleteOrg
  };
}
