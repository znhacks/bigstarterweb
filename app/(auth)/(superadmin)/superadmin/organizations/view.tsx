"use client";

import React from "react";
import {
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Globe,
  Mail,
  Phone,
  Calendar,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { RestoreDialog } from "@/components/restore-dialog";
import { useAdminOrganizations } from "./logic";
import type { SuperadminOrganization } from "./logic";
import { formatDateTime, formatNumber } from "@/lib/i18n/format";

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
import {
  DataGrid,
  DataGridBulkActions,
  DataGridPagination,
  DataGridSearch,
  DataGridTable,
  DataGridToolbar,
  DataGridViewOptions,
  DataTableFacetedFilter
} from "@/components/data-table";

// Komponen penunjang antarmuka kustom
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function SuperadminOrganizationsPage({ data }: { data: SuperadminOrganization[] }) {
  const {
    t,
    locale,
    table,
    columns,
    selectedRows,
    orgToDelete,
    setOrgToDelete,
    alertMessage,
    setAlertMessage,
    isDeletingId,
    isBulkDeleting,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    handleConfirmDeleteOrg,
    handleBulkDelete,
    restoreOpen,
    setRestoreOpen,
    planOptions,
    statusOptions,
    onRestored,
    // Menggunakan state detail organisasi kustom
    activeOrgDetail,
    setActiveOrgDetail
  } = useAdminOrganizations(data);

  const isRtl = locale === "ar";

  return (
    <div className="mx-auto w-full space-y-6 px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
            {t("title")}
          </h1>
        </div>
      </div>
      <DataGrid table={table} columns={columns}>
        <DataGridToolbar>
          <DataGridSearch columnId="name" placeholder={t("searchPlaceholder")} />

          <DataGridBulkActions
            table={table}
            label={t("buttons.bulkActions")}
            actions={[
              {
                label: t("buttons.delete"),
                icon: Trash2,
                tone: "destructive",
                separator: true,
                onSelect: () => setBulkDeleteOpen(true)
              }
            ]}
          />
          <DataTableFacetedFilter
            column={table.getColumn("planName")}
            title="Plan"
            options={planOptions}
          />

          <DataTableFacetedFilter
            column={table.getColumn("planStatus")}
            title="Status"
            options={statusOptions}
          />
          <Button variant="outline" className="h-9 text-xs" onClick={() => setRestoreOpen(true)}>
            <Trash2 className="me-2 h-4 w-4" />
            <span className="hidden sm:inline">{t("buttons.trash")}</span>
          </Button>
          <DataGridViewOptions className="md:ms-auto" label={t("column")} />
        </DataGridToolbar>

        <DataGridTable />
        <DataGridPagination
          pageSizeOptions={[10, 20, 50, 100]}
          rowsPerPageLabel={t("table.rowsPerPage")}
          selectedLabel={(selected, total) => `${selected} / ${total} ${t("selected")}`}
        />
      </DataGrid>

      {/* Backdrop Slide-Over Kustom */}
      {activeOrgDetail && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 min-h-full bg-black/40 transition-opacity duration-300"
          onClick={() => setActiveOrgDetail(null)}
        />
      )}

      {/* Kontainer Slide-Over Detail Organisasi (Mendukung LTR dan RTL) */}
      <div
        className={`border-border bg-background fixed inset-y-0 z-50 flex h-full w-full flex-col shadow-2xl transition-[transform,opacity] duration-300 ease-in-out sm:max-w-lg md:max-w-xl ${
          isRtl ? "left-0 border-r" : "right-0 border-l"
        } ${
          activeOrgDetail
            ? "pointer-events-auto translate-x-0 opacity-100"
            : isRtl
              ? "pointer-events-none -translate-x-full opacity-0"
              : "pointer-events-none translate-x-full opacity-0"
        }`}>
        {/* Header Slide-Over */}
        <div className="border-border space-y-3 border-b p-6">
          <div className="flex items-center justify-between space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
                {activeOrgDetail?.logo ? (
                  <img
                    src={activeOrgDetail.logo}
                    alt={activeOrgDetail.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="bg-primary/10 border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                    <Building2 className="text-primary h-5 w-5" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-foreground text-lg leading-tight font-bold">
                  {activeOrgDetail?.name}
                </h2>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setActiveOrgDetail(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Konten Utama Slide-Over */}
        {activeOrgDetail && (
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Status & Plan Info */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-semibold uppercase">
                {activeOrgDetail.dbModel || "SHARED"} DB
              </Badge>
              <Badge
                className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                  activeOrgDetail.planStatus === "active" && activeOrgDetail.planName !== "Free"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground border-border"
                }`}>
                {activeOrgDetail.planName.toUpperCase()} PLAN
              </Badge>
              <Badge
                variant={activeOrgDetail.status === "active" ? "default" : "secondary"}
                className="text-xs capitalize">
                {activeOrgDetail.status || "Active"}
              </Badge>
            </div>

            {activeOrgDetail.description && (
              <div className="space-y-1.5">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Deskripsi
                </h4>
                <p className="text-foreground bg-muted/40 rounded-lg border p-3 text-sm leading-relaxed">
                  {activeOrgDetail.description}
                </p>
              </div>
            )}

            <Separator />

            {/* Informasi Kontak */}
            <div className="space-y-3">
              <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Kontak Bisnis
              </h4>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="font-medium">{activeOrgDetail.businessEmail || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Telepon</p>
                    <p className="font-medium">{activeOrgDetail.phoneNumber || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Website</p>
                    {activeOrgDetail.website ? (
                      <a
                        href={
                          activeOrgDetail.website.startsWith("http")
                            ? activeOrgDetail.website
                            : `https://${activeOrgDetail.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary font-medium break-all hover:underline">
                        {activeOrgDetail.website}
                      </a>
                    ) : (
                      <p className="font-medium">-</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Lokasi / Alamat */}
            <div className="space-y-3">
              <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Detail Alamat
              </h4>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-1.5 sm:col-span-2">
                  <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Alamat Utama</p>
                    <p className="font-medium">
                      {activeOrgDetail.addressLine1 || "-"}
                      {activeOrgDetail.addressLine2 && `, ${activeOrgDetail.addressLine2}`}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Desa</p>
                  <p className="font-medium">{activeOrgDetail.desa || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Kecamatan</p>
                  <p className="font-medium">{activeOrgDetail.kecamatan || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Kota / Kabupaten</p>
                  <p className="font-medium">{activeOrgDetail.city || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Provinsi</p>
                  <p className="font-medium">{activeOrgDetail.stateProvince || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Kode Pos</p>
                  <p className="font-medium">{activeOrgDetail.postalCode || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Negara</p>
                  <p className="font-medium uppercase">{activeOrgDetail.countryCode || "-"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Konfigurasi & Metadata */}
            <div className="space-y-3">
              <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Sistem & Konfigurasi
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Mata Uang</p>
                  <p className="font-medium uppercase">{activeOrgDetail.currency || "USD"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Bahasa Default</p>
                  <p className="font-medium uppercase">{activeOrgDetail.defaultLocale || "en"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Zona Waktu</p>
                  <p className="font-medium">{activeOrgDetail.timezone || "UTC"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Slug</p>
                  <p className="font-mono text-xs font-medium">{activeOrgDetail.slug || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">NPWP / Tax ID</p>
                  <p className="font-medium">{activeOrgDetail.taxId || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Anggota</p>
                  <p className="font-medium">
                    {formatNumber(activeOrgDetail.memberCount, locale)} Pengguna
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="text-muted-foreground bg-muted flex items-center gap-2 rounded-lg p-3 text-xs">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Dibuat pada: {formatDateTime(activeOrgDetail.created_at, locale)}</span>
            </div>
          </div>
        )}

        {/* Footer Slide-Over */}
        <div className="border-border bg-muted/20 flex items-center justify-end gap-3 border-t p-6">
          <Button variant="outline" onClick={() => setActiveOrgDetail(null)}>
            Kembali
          </Button>
        </div>
      </div>

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

      <ConfirmDeleteDialog
        open={!!orgToDelete}
        onOpenChange={(open) => !open && setOrgToDelete(null)}
        confirmName={orgToDelete?.name || ""}
        title={t("dialogDelete.title")}
        description={t("dialogDelete.desc", { orgName: orgToDelete?.name ?? "" })}
        actionLabel={t("buttons.delete")}
        loading={isDeletingId !== null}
        onConfirm={handleConfirmDeleteOrg}
      />

      {/* AlertDialog Shadcn UI untuk Bulk Delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedRows.length} organisasi terpilih?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan melakukan soft-delete pada organisasi yang dipilih. Anda dapat
              memulihkan kembali data ini melalui menu Trash sewaktu-waktu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center gap-2">
              {isBulkDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RestoreDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        kind="tenant"
        onRestored={onRestored}
      />
    </div>
  );
}
