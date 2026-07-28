"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Building2, Trash2, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { RestoreDialog } from "@/components/restore-dialog";
import { softDeleteTenant } from "@/app/(auth)/(superadmin)/superadmin/actions/account-moderation";

import { useDataTable } from "@/components/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { createSelectColumn } from "@/components/data-table/data-table-select-column";
import { multiSelectFilterFn } from "@/components/data-table/data-table-filters";

import { useTranslations, useLocale } from "next-intl";

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

const getLocalizedValue = (value: any, locale: string): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value[locale] || value["en"] || Object.values(value)[0] || "";
  }
  return String(value);
};

export function OrganizationsList({ data }: { data: SuperadminOrganization[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("superadmin.organizations.list");

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(amount);

  const [orgs, setOrgs] = useState<SuperadminOrganization[]>([]);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<SuperadminOrganization | null>(null);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);

  useEffect(() => {
    const formatted = (data || []).map((org) => ({
      ...org,
      planName: getLocalizedValue(org.planName, locale)
    }));
    setOrgs(formatted);
  }, [data, locale]);

  const totalOrgs = orgs.length;
  const activePremiumOrgs = orgs.filter(
    (o) => o.planStatus === "active" && o.planName !== "Free"
  ).length;
  const totalMembers = orgs.reduce((sum, o) => sum + o.memberCount, 0);

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
        title: t("alerts.failedTitle"),
        description: e.message || t("alerts.failedDesc"),
        variant: "destructive"
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const columns: ColumnDef<SuperadminOrganization, unknown>[] = [
    createSelectColumn<SuperadminOrganization>(),
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Organization" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 border-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
            <Building2 className="text-primary h-4 w-4" />
          </div>
          <span className="text-foreground truncate font-semibold">{row.getValue("name")}</span>
        </div>
      )
    },
    {
      accessorKey: "memberCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("placeholders.members")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.getValue("memberCount")}</span>
      )
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("placeholders.createdOn")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {new Date(row.getValue("created_at")).toLocaleDateString("id-ID")}
        </span>
      )
    },
    {
      accessorKey: "planName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
      filterFn: multiSelectFilterFn,
      cell: ({ row }) => {
        const org = row.original;
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
    },

    {
      id: "planStatus",
      accessorFn: (row) => row.planStatus,
      header: "Status",
      filterFn: multiSelectFilterFn,
      cell: ({ row }) => <span className="capitalize">{row.original.planStatus}</span>
    },
    {
      accessorKey: "price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: ({ row }) => {
        const org = row.original;
        const isActivePremium = org.planStatus === "active" && org.planName !== "Free";
        return (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {isActivePremium ? `${formatPrice(org.price)}/mo` : t("placeholders.freeAccess")}
          </span>
        );
      }
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const org = row.original;
        return (
          <div className="flex justify-end">
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
    }
  ];

  const table = useDataTable({
    columns,
    data: orgs,
    initialColumnVisibility: { planStatus: false }
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    if (
      !confirm(
        `Hapus ${selectedRows.length} organisasi terpilih? Tindakan ini bisa dipulihkan lewat Trash.`
      )
    ) {
      return;
    }

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
          title: t("alerts.failedTitle"),
          description: `${deletedIds.size} berhasil dihapus, ${failed.length} gagal.`,
          variant: "destructive"
        });
      } else {
        setAlertMessage({
          title: t("alerts.deletedTitle"),
          description: `${deletedIds.size} organisasi berhasil dihapus.`,
          variant: "default"
        });
      }

      router.refresh();
    } catch (e: any) {
      setAlertMessage({
        title: t("alerts.failedTitle"),
        description: e.message || t("alerts.failedDesc"),
        variant: "destructive"
      });
    } finally {
      setIsBulkDeleting(false);
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

  return (
    <div className="space-y-8">
      {}
      <div className="flex flex-row flex-wrap items-center gap-2">
        <DataTableSearch table={table} columnId="name" placeholder={t("searchPlaceholder")} />

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

        {selectedRows.length > 0 && (
          <Button
            variant="destructive"
            className="h-9 text-xs"
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}>
            {isBulkDeleting ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="me-2 h-4 w-4" />
            )}
            Hapus {selectedRows.length} terpilih
          </Button>
        )}

        <Button variant="outline" className="h-9 text-xs" onClick={() => setRestoreOpen(true)}>
          <Trash2 className="me-2 h-4 w-4" />
          <span className="hidden sm:inline">{t("buttons.trash")}</span>
        </Button>

        <DataTableViewOptions table={table} className="md:ms-auto" />
      </div>

      {}
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

      {}
      <DataTable table={table} columns={columns} noResultsText={t("placeholders.noOrgs")} />

      <DataTablePagination table={table} />

      {}
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

      {}
      <RestoreDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        kind="tenant"
        onRestored={() => router.refresh()}
      />
    </div>
  );
}
