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

// Impor klien Supabase
import { supabase } from "@/lib/supabase";
import { useLocale, useTranslations } from "next-intl";

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

export function OrganizationsList({ data }: { data: SuperadminOrganization[] }) {
  const router = useRouter();
  // Formatter harga lokal (sebelumnya dari useLanguage, tetapi
  // LanguageProvider tidak lagi membungkus tree setelah migrasi next-intl).
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(amount);
  const t = useTranslations("superadmin.organizations.list");

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
        title: t("alerts.deletedTitle"),
        description: t("alerts.deletedDesc").replace("{orgName}", orgToDelete.name),
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
        title: t("alerts.failedTitle"),
        description: e.message || t("alerts.failedDesc"),
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
      {/* SEARCH BAR */}
      <div className="relative flex w-full max-w-md items-center">
        <Search className="text-muted-foreground/60 absolute start-3.5 h-4 w-4" />
        <Input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-border/80 h-10 rounded-xl ps-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-muted-foreground hover:text-foreground absolute end-3.5">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* NOTIFICATION ALERT */}
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

      {/* ORGANIZATIONS LIST */}
      <Card className="border-border/80 bg-card overflow-hidden rounded-2xl border shadow-sm">
        <CardContent className="p-0">
          <div className="divide-border/60 divide-y">
            {filteredOrgs.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center text-sm">
                {t("placeholders.noOrgs")}
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
                          {t("placeholders.members")}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {t("placeholders.createdOn")}{" "}
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
                        {org.planName.toUpperCase()} {t("placeholders.plan")}
                      </Badge>
                      <span className="text-muted-foreground text-[10px]">
                        {org.planStatus === "active" && org.planName !== "Free"
                          ? `${formatPrice(org.price)}/mo`
                          : t("placeholders.freeAccess")}
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
                      title={t("buttons.delete")}>
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
            <AlertDialogTitle>{t("dialogDelete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogDelete.desc").replace("{orgName}", orgToDelete?.name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingId !== null}>
              {t("buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteOrg}
              disabled={isDeletingId !== null}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground inline-flex items-center gap-2">
              {isDeletingId !== null && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("buttons.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
