"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Calendar,
  CreditCard,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Building
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export interface SuperadminOrganization {
  id: string;
  name: string;
  created_at: string;
  memberCount: number;
  planName: string;
  planStatus: string;
  endsAt: string | null;
  price: number;
}

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

// 1. KAMUS TERJEMAHAN KHUSUS DAFTAR ORGANISASI (Mendukung 3 Bahasa)
const orgListTranslations = {
  English: {
    kpis: {
      total: "Total Organizations",
      premium: "Premium Subscriptions",
      members: "Total Combined Members"
    },
    searchPlaceholder: "Search organizations by name...",
    placeholders: {
      noOrgs: "No organizations found.",
      members: "members",
      createdOn: "Created on",
      freeAccess: "Free Access",
      plan: "PLAN"
    },
    buttons: {
      cancel: "Cancel",
      delete: "Delete Organization"
    },
    dialogDelete: {
      title: "Are you absolutely sure?",
      desc: "This action will permanently delete the organization {orgName} along with all subscription records, transactions, and its members' memberships from the database. This action cannot be undone."
    },
    alerts: {
      deletedTitle: "Organization Deleted",
      deletedDesc:
        "Organization '{orgName}' and all of its associated data have been successfully deleted.",
      failedTitle: "Delete Failed",
      failedDesc: "Failed to delete organization."
    }
  },
  "Bahasa Indonesia": {
    kpis: {
      total: "Total Organisasi",
      premium: "Langganan Premium",
      members: "Total Seluruh Anggota"
    },
    searchPlaceholder: "Cari organisasi berdasarkan nama...",
    placeholders: {
      noOrgs: "Organisasi tidak ditemukan.",
      members: "anggota",
      createdOn: "Dibuat pada tanggal",
      freeAccess: "Akses Gratis",
      plan: "PAKET"
    },
    buttons: {
      cancel: "Batal",
      delete: "Hapus Organisasi"
    },
    dialogDelete: {
      title: "Apakah Anda benar-benar yakin?",
      desc: "Tindakan ini akan menghapus organisasi {orgName} beserta seluruh data relasi langganan, transaksi, dan keanggotaan anggotanya secara permanen dari database. Tindakan ini tidak dapat dibatalkan."
    },
    alerts: {
      deletedTitle: "Organisasi Dihapus",
      deletedDesc:
        "Organisasi '{orgName}' beserta seluruh data relasi dan keanggotaannya berhasil dihapus dari database.",
      failedTitle: "Penghapusan Gagal",
      failedDesc: "Gagal menghapus organisasi."
    }
  },
  Español: {
    kpis: {
      total: "Organizaciones Totales",
      premium: "Suscripciones Premium",
      members: "Total de Miembros Combinados"
    },
    searchPlaceholder: "Buscar organizaciones por nombre...",
    placeholders: {
      noOrgs: "No se encontraron organizaciones.",
      members: "miembros",
      createdOn: "Creado el",
      freeAccess: "Acceso Gratuito",
      plan: "PLAN"
    },
    buttons: {
      cancel: "Cancelar",
      delete: "Eliminar Organización"
    },
    dialogDelete: {
      title: "¿Estás absolutamente seguro?",
      desc: "Esta acción eliminará permanentemente la organización {orgName} junto con todos los registros de suscripción, transacciones y membresías de sus miembros de la base de datos. Esta acción no se puede deshacer."
    },
    alerts: {
      deletedTitle: "Organización Eliminada",
      deletedDesc:
        "La organización '{orgName}' y todos sus datos asociados han sido eliminados con éxito de la base de datos.",
      failedTitle: "Error al Eliminar",
      failedDesc: "No se pudo eliminar la organización."
    }
  }
};

export function OrganizationsList({ data }: { data: SuperadminOrganization[] }) {
  const router = useRouter();
  const { language, formatPrice } = useLanguage();

  // Membaca kamus terjemahan aktif
  const tOrgList = orgListTranslations[language] || orgListTranslations["English"];

  const [orgs, setOrgs] = useState<SuperadminOrganization[]>(data);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [orgToDelete, setOrgToDelete] = useState<SuperadminOrganization | null>(null);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);

  // KPIs Metrics
  const totalOrgs = orgs.length;
  const activePremiumOrgs = orgs.filter(
    (o) => o.planStatus === "active" && o.planName !== "Free"
  ).length;
  const totalMembers = orgs.reduce((sum, o) => sum + o.memberCount, 0);

  useEffect(() => {
    setOrgs(data);
  }, [data]);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // Handler Hapus Organisasi Permanen beserta seluruh data relasi dependensinya (Cascade Clean-up)
  const handleConfirmDeleteOrg = async () => {
    if (!orgToDelete) return;
    setIsDeletingId(orgToDelete.id);
    setAlertMessage(null);

    try {
      // 1. Bersihkan transaksi, langganan, dan keanggotaan penyewa terlebih dahulu untuk menghindari error Foreign Key
      await supabase.from("transactions").delete().eq("tenant_id", orgToDelete.id);
      await supabase.from("subscriptions").delete().eq("tenant_id", orgToDelete.id);
      await supabase.from("memberships").delete().eq("tenant_id", orgToDelete.id);

      // 2. Hapus data utama di tabel tenants
      const { error } = await supabase.from("tenants").delete().eq("id", orgToDelete.id);

      if (error) throw error;

      setAlertMessage({
        title: tOrgList.alerts.deletedTitle,
        description: tOrgList.alerts.deletedDesc.replace("{orgName}", orgToDelete.name),
        variant: "default"
      });

      // Bersihkan localStorage jika organisasi yang dihapus adalah organisasi aktif saat ini
      if (localStorage.getItem("active_org_id") === orgToDelete.id) {
        localStorage.removeItem("active_org_id");
      }

      setOrgs((prev) => prev.filter((o) => o.id !== orgToDelete.id));
      setOrgToDelete(null);

      router.refresh();
    } catch (e: any) {
      setAlertMessage({
        title: tOrgList.alerts.failedTitle,
        description: e.message || tOrgList.alerts.failedDesc,
        variant: "destructive"
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  // Filter pencarian berdasarkan nama organisasi
  const filteredOrgs = orgs.filter((o) => o.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8">
      {/* KPI METRICS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {tOrgList.kpis.total}
              </span>
              <h3 className="text-foreground text-3xl font-bold tracking-tight">{totalOrgs}</h3>
            </div>
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
              <Building className="text-primary h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {tOrgList.kpis.premium}
              </span>
              <h3 className="text-foreground text-3xl font-bold tracking-tight">
                {activePremiumOrgs}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <CreditCard className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 rounded-2xl border shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {tOrgList.kpis.members}
              </span>
              <h3 className="text-foreground text-3xl font-bold tracking-tight">{totalMembers}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH BAR */}
      <div className="relative flex w-full max-w-md items-center">
        <Search className="text-muted-foreground/60 absolute left-3.5 h-4 w-4" />
        <Input
          type="text"
          placeholder={tOrgList.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-border/80 h-10 rounded-xl pl-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-muted-foreground hover:text-foreground absolute right-3.5">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* NOTIFICATION ALERT */}
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

      {/* ORGANIZATIONS LIST */}
      <Card className="border-border/80 bg-card overflow-hidden rounded-2xl border shadow-sm">
        <CardContent className="p-0">
          <div className="divide-border/60 divide-y">
            {filteredOrgs.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center text-sm">
                {tOrgList.placeholders.noOrgs}
              </div>
            ) : (
              filteredOrgs.map((org) => (
                <div
                  key={org.id}
                  className="hover:bg-accent/5 flex flex-col justify-between gap-6 p-6 transition-colors md:flex-row md:items-center">
                  {/* Left: Icon, Name, Members & Date */}
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="bg-primary/10 border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                      <Building2 className="text-primary h-5 w-5" />
                    </div>
                    <div className="flex min-w-0 flex-col space-y-1">
                      <span className="text-foreground truncate text-base font-bold">
                        {org.name}
                      </span>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {org.memberCount}{" "}
                          {tOrgList.placeholders.members}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {tOrgList.placeholders.createdOn}{" "}
                          {new Date(org.created_at).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Active Plan & Badge */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          org.planStatus === "active" && org.planName !== "Free"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                            : "bg-muted text-muted-foreground border-border/60"
                        }`}>
                        {org.planName.toUpperCase()} {tOrgList.placeholders.plan}
                      </Badge>
                      <span className="text-muted-foreground text-[10px]">
                        {org.planStatus === "active" && org.planName !== "Free"
                          ? `${formatPrice(org.price)}/mo`
                          : tOrgList.placeholders.freeAccess}
                      </span>
                    </div>
                  </div>

                  {/* Right: Delete Action Button */}
                  <div className="flex shrink-0 items-center">
                    <Button
                      onClick={() => setOrgToDelete(org)}
                      disabled={isDeletingId !== null}
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-9 w-9 rounded-lg"
                      title={tOrgList.buttons.delete}>
                      {isDeletingId === org.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* SHADCN DIALOG KONFIRMASI HAPUS ORGANISASI */}
      <AlertDialog open={!!orgToDelete} onOpenChange={(open) => !open && setOrgToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tOrgList.dialogDelete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {tOrgList.dialogDelete.desc.replace("{orgName}", orgToDelete?.name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingId !== null}>
              {tOrgList.buttons.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteOrg}
              disabled={isDeletingId !== null}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground inline-flex items-center gap-2">
              {isDeletingId !== null && <Loader2 className="h-4 w-4 animate-spin" />}
              {tOrgList.buttons.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
