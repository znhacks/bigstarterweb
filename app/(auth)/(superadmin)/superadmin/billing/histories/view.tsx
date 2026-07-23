// app/(auth)/(superadmin)/superadmin/billing/transactions/view.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Impor klien Supabase, Global Language Hook
import { supabase } from "@/lib/supabase";
import { transactionRepository } from "@/supabase/repositories/transactions";
import { useLocale, useTranslations } from "next-intl";
import { formatTransactionAmount } from "@/lib/i18n/currency";
import { formatDateTime } from "@/lib/i18n/format";
import { getLocaleMeta } from "@/config/i18n-culture";

// Reusable Table Components
import { useDataTable } from "@/components/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { multiSelectFilterFn } from "@/components/data-table/data-table-filters";

interface SuperadminTransaction {
  id: string;
  amount: number;
  currency: string | null;
  amount_in_idr: number | null;
  plan_name: string;
  order_id: string;
  status: string;
  created_at: string;
  tenants: {
    name: string;
  } | null;
}

const containsFilterFn = (row: any, columnId: string, filterValue: string) => {
  if (!filterValue) return true;
  return String(row.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase());
};

export function SuperadminTransactionsPage() {
  const locale = useLocale();
  const t = useTranslations("superadmin.billing.histories");
  const ttable = useTranslations("data-table");

  // Ambil metadata arah layout dinamis
  const meta = getLocaleMeta(locale);

  const [transactions, setTransactions] = useState<SuperadminTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (await transactionRepository(supabase))
        .query()
        .select(
          `
          id,
          amount,
          currency,
          amount_in_idr,
          plan_name,
          order_id,
          status,
          created_at,
          tenants (
            name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setTransactions(data as unknown as SuperadminTransaction[]);
      }
    } catch (e) {
      console.error("Gagal memuat riwayat transaksi:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Penerjemahan Opsi Filter Dropdown Status secara dinamis peka-kultur
  const statusOptions = useMemo(() => {
    return [
      { value: "paid", label: t("statuses.paid") || "Paid" },
      { value: "completed", label: t("statuses.completed") || "Completed" },
      { value: "pending", label: t("statuses.pending") || "Pending" },
      { value: "failed", label: t("statuses.failed") || "Failed" },
      { value: "refunded", label: t("statuses.refunded") || "Refunded" }
    ];
  }, [t]);

  const planOptions = useMemo(() => {
    const unique = Array.from(new Set(transactions.map((tx) => tx.plan_name).filter(Boolean)));
    return unique.map((name) => ({ value: name, label: name }));
  }, [transactions]);

  const columns = useMemo<ColumnDef<SuperadminTransaction, unknown>[]>(
    () => [
      {
        accessorKey: "tenants.name",
        meta: {
          label: t("table.tenant")
        },
        id: "tenants_name", // SOLUSI: ID Kolom Eksplisit untuk meredam crash TanStack
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.tenant") || "Tenant"} />
        ),
        filterFn: containsFilterFn,
        cell: ({ row }) => {
          const tx = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground font-semibold">
                {tx.tenants?.name || "Unknown Tenant"}
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">{tx.order_id}</span>
            </div>
          );
        }
      },
      {
        accessorKey: "plan_name",
        meta: {
          label: t("table.plan")
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.plan") || "Plan"} />
        ),
        filterFn: multiSelectFilterFn,
        cell: ({ row }) => row.original.plan_name
      },
      {
        accessorKey: "created_at",
        meta: {
          label: t("table.created_at")
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.date") || "Date"} />
        ),
        cell: ({ row }) => {
          // SOLUSI: Menggunakan formatDateTime standard BCP-47 peka-kultur
          return formatDateTime(row.original.created_at, locale, { dateStyle: "medium" });
        }
      },
      {
        accessorKey: "amount",
        meta: {
          label: t("table.amount")
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.amount") || "Amount"} />
        ),
        cell: ({ row }) => {
          const tx = row.original;
          const isRefunded = tx.status === "refunded";
          return (
            <span className={`font-bold ${isRefunded ? "text-red-600" : "text-foreground"}`}>
              {isRefunded ? "-" : ""}
              {formatTransactionAmount(tx.amount, tx.currency, tx.amount_in_idr, locale)}
            </span>
          );
        }
      },
      {
        accessorKey: "status",
        meta: {
          label: t("table.status")
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status") || "Status"} />
        ),
        filterFn: multiSelectFilterFn,
        cell: ({ row }) => {
          const tx = row.original;
          const isRefunded = tx.status === "refunded";
          return (
            <Badge
              className={`rounded-full text-[9px] font-bold uppercase ${
                isRefunded
                  ? "border border-red-500/20 bg-red-500/10 text-red-600"
                  : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
              }`}>
              {/* SOLUSI: Melokalisasi cetakan nama badge status */}
              {t.has(`statuses.${tx.status}`) ? t(`statuses.${tx.status}`) : tx.status}
            </Badge>
          );
        }
      }
    ],
    [locale, t]
  );

  const table = useDataTable({ columns, data: transactions });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-6 px-4 py-10" dir={meta.dir}>
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-row flex-wrap items-center gap-2">
          {/* SOLUSI: Cari tenants_name */}
          <DataTableSearch
            table={table}
            columnId="tenants_name"
            placeholder={t("table.search") || "Cari tenant..."}
          />

          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title={t("table.status") || "Status"}
            options={statusOptions} // Gunakan opsi terjemahan dinamis
          />

          <DataTableFacetedFilter
            column={table.getColumn("plan_name")}
            title={t("table.plan") || "Plan"}
            options={planOptions}
          />

          <DataTableViewOptions table={table} className="md:ms-auto" label={t("filters.columns")} />
        </div>

        <DataTable
          table={table}
          columns={columns}
          noResultsText={t("placeholders.noTransactions")}
        />

        <DataTablePagination
          table={table}
          selectedLabel={(selected, total) =>
            ttable("pagination.selecteddata", {
              selected,
              total
            })
          }
          rowsPerPageLabel={ttable("pagination.rowsPerPage")}
          previousLabel={ttable("pagination.previous")} // Dikirim dinamis
          nextLabel={ttable("pagination.next")}
        />
      </div>
    </div>
  );
}
