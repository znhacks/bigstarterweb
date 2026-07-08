"use client";

import * as React from "react";
import { Users, Upload, CheckCircle2, AlertCircle, X, Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { useOrganizationGeneral } from "./logic"; // Sesuaikan path-nya

export function OrganizationGeneralSettings() {
  const {
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
  } = useOrganizationGeneral();

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
    <div className="space-y-6">
      {/* SHADCN ALERT NOTIFICATION */}
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

      {/* TAMPILAN BANNER INFO READ-ONLY JIKA USER ADALAH MEMBER */}
      {isReadOnly && (
        <Alert className="rounded-2xl border-amber-500/20 bg-amber-500/10 text-amber-600">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertTitle>{t("readOnlyTitle")}</AlertTitle>
          <AlertDescription>{t("readOnlyDesc")}</AlertDescription>
        </Alert>
      )}

      {/* KONSOLIDASI: SATU CARD UNTUK SELURUH PENGATURAN ORGANISASI */}
      <Card className="overflow-hidden">
        <CardContent className="divide-border/60 divide-y p-0">
          {/* Section 1: Organization Logo */}
          <div className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
            <div className="space-y-1 md:max-w-md">
              <h2 className="text-foreground text-base font-semibold">{t("logo.title")}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{t("logo.desc")}</p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <div
                onClick={isReadOnly || isUploadingLogo ? undefined : () => setCropperOpen(true)}
                className={`group bg-muted border-border/60 relative flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border transition-all ${
                  isReadOnly ? "cursor-default" : "hover:bg-muted/80 cursor-pointer"
                }`}>
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
                {!isReadOnly && !isUploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Organization Name */}
          <div className="space-y-4 p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
              <div className="md:max-w-md">
                <h2 className="text-foreground text-base font-semibold">{t("name.title")}</h2>
              </div>
              <div className="w-full md:max-w-xl">
                <Input
                  type="text"
                  required
                  disabled={isSaving || isReadOnly}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="border-border/80 h-10 w-full focus-visible:ring-1"
                />
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveName}
                  disabled={isSaving || !orgName.trim()}
                  variant="secondary"
                  size="sm"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-2 rounded-lg px-5 text-xs">
                  {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                  {tCommon("save")}
                </Button>
              </div>
            )}
          </div>

          {/* Section 3: Delete Organization (Danger Zone) - Hanya utk pemegang organization.delete (Owner) */}
          {canDeleteOrg && (
            <div className="flex flex-col items-start justify-between gap-6 bg-red-50/10 p-8 md:flex-row md:items-center">
              <div className="space-y-1.5 md:max-w-xl">
                <h2 className="text-destructive text-base font-semibold">{t("delete.title")}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{t("delete.desc")}</p>
              </div>

              <div className="flex shrink-0">
                <Button
                  onClick={() => setIsConfirmOpen(true)}
                  variant="destructive"
                  className="h-auto rounded-full bg-red-700 px-6 py-2 text-sm font-medium text-white hover:bg-red-800">
                  {t("delete.btn")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG KONFIRMASI TYPE-TO-CONFIRM HAPUS ORGANISASI */}
      <ConfirmDeleteDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        confirmName={orgName || "organization"}
        title={t("delete.dialogTitle")}
        description={t("delete.dialogDesc", { orgName })}
        actionLabel={tCommon("delete")}
        loading={isDeleting}
        onConfirm={handleDeleteOrganization}
      />

      {/* REUSABLE IMAGE CROPPER DIALOG */}
      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
