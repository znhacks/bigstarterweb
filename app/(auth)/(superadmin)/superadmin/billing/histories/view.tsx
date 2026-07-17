"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Impor klien Supabase, Global Language Hook
import { supabase } from "@/lib/supabase";
import { useLocale, useTranslations } from "next-intl";
import { formatTransactionAmount } from "@/lib/i18n/currency";

// Reusable Table Components
import { useDataTable } from "@/components/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

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

export function SuperadminTransactionsPage() {
  const locale = useLocale();
  const t = useTranslations("superadmin.billing");

  const [transactions, setTransactions] = useState<SuperadminTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
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

  const columns = useMemo<ColumnDef<SuperadminTransaction, unknown>[]>(
    () => [
      {
        accessorKey: "tenants.name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.tenant") || "Tenant"} />
        ),
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.plan") || "Plan"} />
        ),
        cell: ({ row }) => row.original.plan_name
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.date") || "Date"} />
        ),
        cell: ({ row }) => {
          return new Date(row.original.created_at).toLocaleDateString(
            locale === "id" ? "id-ID" : "en-US"
          );
        }
      },
      {
        accessorKey: "amount",
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status") || "Status"} />
        ),
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
              {tx.status}
            </Badge>
          );
        }
      }
    ],
    [locale, t]
  );

  const table = useDataTable({
    columns,
    data: transactions
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Riwayat Transaksi</h1>
        <p className="text-muted-foreground text-sm">
          Menampilkan catatan seluruh mutasi pembayaran dan riwayat invoice masuk secara global.
        </p>
      </div>

      <div className="border-border/80 bg-card rounded-2xl border p-6 shadow-sm">
        <DataTable
          table={table}
          columns={columns}
          noResultsText={t("placeholders.noTransactions")}
        />
      </div>
    </div>
  );
}
