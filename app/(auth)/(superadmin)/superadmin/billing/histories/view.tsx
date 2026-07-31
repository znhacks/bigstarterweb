"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { supabase } from "@/lib/supabase";
import { transactionRepository } from "@/supabase/repositories/transactions";
import { useLocale, useTranslations } from "next-intl";
import { formatTransactionAmount } from "@/lib/i18n/currency";
import { formatDateTime } from "@/lib/i18n/format";
import { getLocaleMeta } from "@/config/i18n-culture";

import {
  useDataGrid,
  DataGrid,
  DataGridToolbar,
  DataGridContent,
  DataGridSearch,
  DataGridFacetedFilter,
  DataGridViewOptions,
  DataGridTable,
  DataGridPagination,
  multiSelectFilterFn,
  textCol,
  dateCol,
  numCol
} from "@/components/data-table";

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

  const meta = getLocaleMeta(locale);

  const [transactions, setTransactions] = useState<SuperadminTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (
        await transactionRepository(supabase)
      )
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

  const columns: ColumnDef<SuperadminTransaction>[] = [
    textCol<SuperadminTransaction>({
      key: "tenants_name",
      header: t("table.tenant"),
      cell: (row) => {
        const tx = row;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground font-semibold">
              {tx.tenants?.name || "Unknown Tenant"}
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">{tx.order_id}</span>
          </div>
        );
      }
    }),
    textCol<SuperadminTransaction>({
      key: "plan_name",
      header: t("table.plan"),
      cell: (row) => row.plan_name
    }),
    dateCol<SuperadminTransaction>({
      key: "created_at",
      header: t("table.date"),
      cell: (row) => {
        return formatDateTime(row.created_at, locale, { dateStyle: "medium" });
      }
    }),
    numCol<SuperadminTransaction>({
      key: "amount",
      header: t("table.amount"),
      cell: (row) => {
        const tx = row;
        const isRefunded = tx.status === "refunded";
        return (
          <span className={`font-bold ${isRefunded ? "text-red-600" : "text-foreground"}`}>
            {isRefunded ? "-" : ""}
            {formatTransactionAmount(tx.amount, tx.currency, tx.amount_in_idr, locale)}
          </span>
        );
      }
    }),
    textCol<SuperadminTransaction>({
      key: "status",
      header: t("table.status"),
      cell: (row) => {
        const tx = row;
        const isRefunded = tx.status === "refunded";
        return (
          <Badge
            className={`rounded-full text-[9px] font-bold uppercase ${
              isRefunded
                ? "border border-red-500/20 bg-red-500/10 text-red-600"
                : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
            }`}>
            {}
            {t.has(`statuses.${tx.status}`) ? t(`statuses.${tx.status}`) : tx.status}
          </Badge>
        );
      }
    })
  ];

  const table = useDataGrid({ columns, data: transactions });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-3" dir={meta.dir}>
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <DataGrid table={table} columns={columns}>
        <DataGridToolbar>
          <DataGridSearch columnId="tenants_name" placeholder={t("table.search")} />
          <DataGridFacetedFilter
            columnId="status"
            title={t("table.status") || "Status"}
            options={statusOptions}
          />

          <DataGridFacetedFilter
            columnId="plan_name"
            title={t("table.plan") || "Plan"}
            options={planOptions}
          />
          <DataGridViewOptions label={t("filters.columns")} className="md:ms-auto" />
        </DataGridToolbar>
        <DataGridContent>
          <DataGridTable />
          <DataGridPagination
            pageSizeOptions={[10, 20, 50, 100]}
            rowsPerPageLabel={t("table.rowsPerPage")}
            selectedLabel={(selected, total) => `${selected} / ${total} ${t("selected")}`}
          />
        </DataGridContent>
      </DataGrid>
    </div>
  );
}
