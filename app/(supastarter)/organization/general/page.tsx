"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, Upload, CheckCircle2, AlertCircle, X, Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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

// Impor klien Supabase & Global Language Hook
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/providers/language-provider";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

// 1. KAMUS TERJEMAHAN KHUSUS HALAMAN ORGANIZATION GENERAL (Mendukung 3 Bahasa)
const orgTranslations = {
  English: {
    title: "Organization Settings",
    subTitle: "Manage the settings of the organization.",
    readOnlyTitle: "Read-Only Mode",
    readOnlyDesc:
      "You are logged in as a **Member**. You are only allowed to view organization settings and do not have access to modify them.",
    logo: {
      title: "Organization logo",
      desc: "Upload a logo for your organization."
    },
    name: {
      title: "Organization name"
    },
    delete: {
      title: "Delete organization",
      desc: "Permanently delete your organization. Once you delete your organization, there is no going back. To confirm, please click the button on the right:",
      btn: "Delete organization",
      dialogTitle: "Are you absolutely sure?",
      dialogDesc:
        "This action will permanently delete the organization {orgName} along with all associated memberships and subscriptions. This action cannot be undone."
    },
    alerts: {
      successLogo: "Organization logo successfully updated in database.",
      successName: "Organization name successfully updated.",
      successDelete: "Organization successfully deleted.",
      errorLoad: "Failed to load organization details and permissions."
    }
  },
  "Bahasa Indonesia": {
    title: "Pengaturan Organisasi",
    subTitle: "Kelola pengaturan umum organisasi Anda.",
    readOnlyTitle: "Mode Baca Saja",
    readOnlyDesc:
      "Anda masuk sebagai anggota (**Member**). Anda hanya diizinkan untuk melihat pengaturan organisasi dan tidak memiliki hak akses untuk memodifikasinya.",
    logo: {
      title: "Logo organisasi",
      desc: "Unggah logo untuk organisasi Anda."
    },
    name: {
      title: "Nama organisasi"
    },
    delete: {
      title: "Hapus organisasi",
      desc: "Hapus organisasi Anda secara permanen. Setelah dihapus, data tidak dapat dikembalikan. Untuk konfirmasi, silakan klik tombol di samping:",
      btn: "Hapus organisasi",
      dialogTitle: "Apakah Anda benar-benar yakin?",
      dialogDesc:
        "Tindakan ini akan menghapus organisasi {orgName} beserta seluruh data relasi keanggotaan dan paket berlangganannya. Tindakan ini tidak dapat dibatalkan."
    },
    alerts: {
      successLogo: "Logo organisasi berhasil diperbarui di database.",
      successName: "Nama organisasi berhasil diperbarui.",
      successDelete: "Organisasi berhasil dihapus secara permanen.",
      errorLoad: "Gagal memuat rincian dan hak akses organisasi."
    }
  },
  Español: {
    title: "Configuración de la organización",
    subTitle: "Administre la configuración general de la organización.",
    readOnlyTitle: "Modo de solo lectura",
    readOnlyDesc:
      "Ha iniciado sesión como **Miembro**. Solo se le permite ver la configuración de la organización y no tiene acceso para modificarla.",
    logo: {
      title: "Logotipo de la organización",
      desc: "Sube un logotipo para tu organización."
    },
    name: {
      title: "Nombre de la organización"
    },
    delete: {
      title: "Eliminar organización",
      desc: "Eliminar permanentemente su organización. Una vez que elimines tu organización, no hay marcha atrás. Para confirmar, ingresa tu contraseña a continuación:",
      btn: "Eliminar organización",
      dialogTitle: "¿Estás absolutamente seguro?",
      dialogDesc:
        "Esta acción eliminará permanentemente la organización {orgName} junto con todas las membresías y suscripciones. Esta acción no se puede deshacer."
    },
    alerts: {
      successLogo: "El logotipo de la organización se actualizó correctamente en la base de datos.",
      successName: "El nombre de la organización se actualizó correctamente.",
      successDelete: "Organización eliminada permanentemente.",
      errorLoad: "No se pudieron cargar los detalles y permisos de la organización."
    }
  }
};

export default function OrganizationGeneralSettings() {
  const router = useRouter();
  const { language, t } = useLanguage();

  // Membaca kamus bahasa aktif untuk halaman organisasi
  const tOrg = orgTranslations[language] || orgTranslations["English"];

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Hak Akses Role
  const [userRole, setUserRole] = useState<"Owner" | "Admin" | "Member" | null>(null);

  // State untuk manajemen pemotongan gambar (Cropping)
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

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
      // 1. Ambil data user aktif saat ini
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/dashboard/login/v2");
        return;
      }

      // 2. Ambil rincian nama tenant & data role keanggotaan secara paralel
      const [tenantRes, membershipRes] = await Promise.all([
        supabase.from("tenants").select("name, logo").eq("id", orgId).single(),
        supabase
          .from("memberships")
          .select("role")
          .eq("tenant_id", orgId)
          .eq("user_id", user.id)
          .maybeSingle()
      ]);

      if (tenantRes.error) throw tenantRes.error;
      if (tenantRes.data) {
        setOrgName(tenantRes.data.name);
        setLogoPreview((tenantRes.data as any).logo || null);
      }

      if (membershipRes.data) {
        setUserRole(membershipRes.data.role as "Owner" | "Admin" | "Member");
      }
    } catch (error: any) {
      console.error("Error fetching org details & role:", error);
      setAlertMessage({
        title: "Error",
        description: tOrg.alerts.errorLoad,
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

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  // MEMBUKA MODAL CROPPER SAAT FILE GAMBAR DIPILIH
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string); // Simpan sumber gambar mentah
        setCropperOpen(true); // Buka dialog pemotongan
      };
      reader.readAsDataURL(file);
    }
  };

  // PROSES UPLOAD REAL BERKAS WEBP HASIL POTONGAN KE SUPABASE STORAGE
  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!activeOrgId) return;

    setIsUploadingLogo(true);
    setAlertMessage(null);

    try {
      // Menggunakan ekstensi berkas .webp karena dikonversi secara real oleh canvas
      const filePath = `organizations/${activeOrgId}/${Date.now()}.webp`;

      // A. Unggah berkas webp terkompresi ke Supabase Storage (Bucket 'avatars')
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // B. Dapatkan URL Publik
      const {
        data: { publicUrl }
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // C. Update kolom logo di tabel tenants
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({ logo: publicUrl })
        .eq("id", activeOrgId);

      if (tenantError) throw tenantError;

      // Sukses
      setLogoPreview(publicUrl);
      window.dispatchEvent(new Event("storage")); // Refresh Sidebar Icon

      setAlertMessage({
        title: language === "English" ? "Success" : "Sukses",
        description: tOrg.alerts.successLogo,
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

  // Menyimpan perubahan nama organisasi ke Supabase
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
        title: language === "English" ? "Success" : "Sukses",
        description: tOrg.alerts.successName,
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

  // Menghapus organisasi secara permanen dari Supabase
  const handleDeleteOrganization = async () => {
    if (!activeOrgId) return;
    setIsDeleting(true);
    setAlertMessage(null);

    try {
      await supabase.from("subscriptions").delete().eq("tenant_id", activeOrgId);
      await supabase.from("memberships").delete().eq("tenant_id", activeOrgId);

      const { error } = await supabase.from("tenants").delete().eq("id", activeOrgId);

      if (error) throw error;

      localStorage.removeItem("active_org_id");

      setAlertMessage({
        title: language === "English" ? "Success" : "Sukses",
        description: tOrg.alerts.successDelete,
        variant: "default"
      });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message || "Gagal menghapus organisasi.",
        variant: "destructive"
      });
      setIsDeleting(false);
    }
  };

  // Tentukan apakah user hanya memiliki hak akses baca saja (role: Member)
  const isReadOnly = userRole === "Member";

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeOrgId) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Active Organization</AlertTitle>
          <AlertDescription>
            Silakan pilih organisasi terlebih dahulu pada menu pilihan organisasi di sidebar kiri
            Anda.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      {/* Header Halaman */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{tOrg.title}</h1>
        <p className="text-muted-foreground text-sm">{tOrg.subTitle}</p>
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

      {/* TAMPILAN BANNER INFO READ-ONLY JIKA USER ADALAH MEMBER */}
      {isReadOnly && (
        <Alert className="rounded-2xl border-amber-500/20 bg-amber-500/10 text-amber-600">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertTitle>{tOrg.readOnlyTitle}</AlertTitle>
          <AlertDescription>{tOrg.readOnlyDesc}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Card 1: Organization Logo */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
            <div className="space-y-1 md:max-w-md">
              <h2 className="text-foreground text-base font-semibold">{tOrg.logo.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{tOrg.logo.desc}</p>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoChange}
                accept="image/*"
                className="hidden"
                disabled={isReadOnly || isUploadingLogo}
              />
              <div
                onClick={isReadOnly || isUploadingLogo ? undefined : handleLogoClick}
                className={`group bg-muted border-border/60 relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-all ${
                  isReadOnly ? "cursor-default" : "hover:bg-muted/80 cursor-pointer"
                }`}>
                {/* Visual Loading Spinner saat proses upload gambar ke Supabase Storage */}
                {isUploadingLogo ? (
                  <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                ) : logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Organization Logo"
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <Users className="text-muted-foreground h-6 w-6 transition-transform group-hover:scale-105" />
                )}
                {/* Hanya munculkan ikon hover upload jika bukan Read-Only dan tidak sedang Loading */}
                {!isReadOnly && !isUploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Organization Name */}
        <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
          <CardContent className="flex flex-col gap-6 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">{tOrg.name.title}</h2>
              </div>
              <div className="w-full md:max-w-xl">
                <Input
                  type="text"
                  required
                  disabled={isSaving || isReadOnly} // Disable input jika Read-Only (Member)
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="border-border/80 h-10 w-full focus-visible:ring-1"
                />
              </div>
            </div>

            {/* Sembunyikan tombol Save jika memiliki hak akses Member */}
            {!isReadOnly && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveName}
                  disabled={isSaving || !orgName.trim()}
                  variant="secondary"
                  size="sm"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-2 rounded-lg px-5 text-xs">
                  {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                  {t.common.save}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Delete Organization (HANYA MUNCUL JIKA USER BUKAN MEMBER) */}
        {!isReadOnly && (
          <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
            <CardContent className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
              <div className="space-y-1.5 md:max-w-xl">
                <h2 className="text-destructive text-base font-semibold">{tOrg.delete.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{tOrg.delete.desc}</p>
              </div>

              <div className="flex shrink-0">
                <Button
                  onClick={() => setIsConfirmOpen(true)}
                  variant="destructive"
                  className="h-auto rounded-full bg-red-700 px-6 py-2 text-sm font-medium text-white hover:bg-red-800">
                  {tOrg.delete.btn}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* SHADCN DIALOG KONFIRMASI PENGHAPUSAN ORGANISASI */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tOrg.delete.dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {tOrg.delete.dialogDesc.replace("{orgName}", orgName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrganization}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground inline-flex items-center gap-2">
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* REUSABLE IMAGE CROPPER DIALOG */}
      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={imageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={1} // Memotong secara melingkar/persegi 1:1
      />
    </div>
  );
}
