"use client";

import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Building2, Trash2, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { softDeleteTenant } from "@/app/(auth)/(superadmin)/superadmin/actions/account-moderation";

import {
  useDataTable,
  createSelectColumn,
  actionCol,
  dateCol,
  numCol,
  textCol
} from "@/components/data-table";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { formatDateTime, formatNumber } from "@/lib/i18n/format";

export interface SuperadminOrganization {
  id: string;
  name: string;
  logo: string | null;
  created_at: string;
  memberCount: number;
  planName: string;
  planStatus: string;
  endsAt: string | null;
  price: number;

  // Field Detail Organisasi Tambahan (Sesuai Schema Database)
  slug?: string | null;
  dbModel?: string;
  status?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  businessEmail?: string | null;
  phoneNumber?: string | null;
  taxId?: string | null;
  defaultLocale?: string;
  timezone?: string;
  currency?: string;
  description?: string | null;
  website?: string | null;
  kecamatan?: string | null;
  desa?: string | null;
}

export interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export const getLocalizedValue = (value: any, locale: string): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value[locale] || value["en"] || Object.values(value)[0] || "";
  }
  return String(value);
};

export function useAdminOrganizations(data: SuperadminOrganization[]) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("superadmin.organizations");

  const formatOrgs = (list: SuperadminOrganization[]): SuperadminOrganization[] =>
    (list || []).map((org) => ({
      ...org,
      planName: getLocalizedValue(org.planName, locale)
    }));

  const [orgs, setOrgs] = useState<SuperadminOrganization[]>(() => formatOrgs(data));
  const [prevData, setPrevData] = useState(data);
  const [prevLocale, setPrevLocale] = useState(locale);

  if (data !== prevData || locale !== prevLocale) {
    setPrevData(data);
    setPrevLocale(locale);
    setOrgs(formatOrgs(data));
  }

  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<SuperadminOrganization | null>(null);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);

  // State untuk menyimpan data organisasi yang sedang aktif dilihat melalui Slide-over Sheet
  const [activeOrgDetail, setActiveOrgDetail] = useState<SuperadminOrganization | null>(null);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const handleConfirmDeleteOrg = async () => {
    if (!orgToDelete) return;
    setIsDeletingId(orgToDelete.id);
    setAlertMessage(null);

    try {
      const res = await softDeleteTenant(orgToDelete.id);
      if (res.error) throw new Error(res.error);

      setAlertMessage({
        title: t("alerts.deletedTitle"),
        description: t("alerts.deletedDesc", { orgName: orgToDelete.name ?? "" }),
        variant: "default"
      });

      setOrgs((prev) => prev.filter((o) => o.id !== orgToDelete.id));
      setOrgToDelete(null);
      router.refresh();
    } catch (e: any) {
      setAlertMessage({
        title: t("alerts.failed.title"),
        description: e.message || t("alerts.failed.desc"),
        variant: "destructive"
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const columns: ColumnDef<SuperadminOrganization>[] = [
    createSelectColumn<SuperadminOrganization>(),
    textCol<SuperadminOrganization>({
      key: "name",
      header: t("table.name"),
      cell: (row) => (
        <button
          onClick={() => setActiveOrgDetail(row)}
          className="flex items-center gap-3 text-left transition-opacity hover:opacity-80 focus:outline-none">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {row.logo ? (
              <img src={row.logo} alt={row.name || "Logo"} className="h-full w-full object-cover" />
            ) : (
              <div className="bg-primary/10 border-primary/20 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                <Building2 className="text-primary h-4 w-4" />
              </div>
            )}
          </div>
          <span className="text-foreground decoration-primary truncate font-semibold hover:underline">
            {row.name}
          </span>
        </button>
      )
    }),
    numCol<SuperadminOrganization>({
      key: "memberCount",
      header: t("table.members"),
      cell: (row) => (
        <span className="text-muted-foreground text-xs">
          {formatNumber(row.memberCount, locale)}
        </span>
      )
    }),
    dateCol<SuperadminOrganization>({
      key: "created_at",
      header: t("table.createdOn"),
      cell: (row) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {formatDateTime(row.created_at, locale)}
        </span>
      )
    }),
    textCol<SuperadminOrganization>({
      key: "planName",
      header: t("table.plan"),
      cell: (row) => {
        const org = row;
        const isActivePremium = org.planStatus === "active" && org.planName !== "Free";
        return (
          <Badge
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
              isActivePremium
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                : "bg-muted text-muted-foreground border-border/60"
            }`}>
            {org.planName.toUpperCase()} {t("placeholders.plan")}
          </Badge>
        );
      }
    }),

    textCol<SuperadminOrganization>({
      key: "planStatus",
      header: t("table.status"),
      cell: (row) => <span className="capitalize">{row.planStatus}</span>
    }),
    numCol<SuperadminOrganization>({
      key: "price",
      header: t("table.price"),
      cell: (row) => {
        const org = row;
        const isActivePremium = org.planStatus === "active" && org.planName !== "Free";
        return (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {isActivePremium ? `${formatNumber(org.price, locale)}` : t("placeholders.freeAccess")}
          </span>
        );
      }
    }),
    actionCol<SuperadminOrganization>({
      header: t("table.actions"),
      enableHiding: false,
      cell: (row) => {
        const org = row;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              onClick={() => setActiveOrgDetail(org)}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-lg"
              title="Lihat Detail">
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setOrgToDelete(org)}
              disabled={isDeletingId !== null || isBulkDeleting}
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
        );
      }
    })
  ];

  const table = useDataTable({
    columns,
    data: orgs
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    setIsBulkDeleting(true);
    setAlertMessage(null);

    try {
      const targets = selectedRows.map((r) => r.original);
      const results = await Promise.all(targets.map((o) => softDeleteTenant(o.id)));
      const failed = results.filter((r) => r.error);

      const deletedIds = new Set(targets.filter((_, i) => !results[i].error).map((o) => o.id));
      setOrgs((prev) => prev.filter((o) => !deletedIds.has(o.id)));
      table.resetRowSelection();

      if (failed.length > 0) {
        setAlertMessage({
          title: t("alerts.failedLength.title"),
          description: t("alerts.failedLength.desc", {
            deletedSize: deletedIds.size,
            failedLength: failed.length
          }),
          variant: "destructive"
        });
      } else {
        setAlertMessage({
          title: t("alerts.successDelete.title"),
          description: t("alerts.successDelete.desc", { deletedSize: deletedIds.size }),
          variant: "default"
        });
      }

      router.refresh();
    } catch (e: any) {
      setAlertMessage({
        title: t("alerts.failed.title"),
        description: e.message || t("alerts.failed.desc"),
        variant: "destructive"
      });
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const planOptions = [
    { value: "Free", label: "Free" },
    { value: "Starter", label: "Starter" },
    { value: "Pro", label: "Pro" },
    { value: "Enterprise", label: "Enterprise" }
  ];

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
    { value: "refund_requested", label: "Refund Requested" }
  ];

  const onRestored = () => router.refresh();

  return {
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
    // Ekspor state detail organisasi baru
    activeOrgDetail,
    setActiveOrgDetail
  };
}
