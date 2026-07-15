// app/(auth)/(users)/[tenant_slug]/organization/billing/history/view.tsx
"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

import { formatDateTime } from "@/lib/i18n/format";
import { formatTransactionAmount } from "@/lib/i18n/currency";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

import { useBillingHistory, Transaction } from "./logic";

export function BillingHistory() {
  const {
    locale,
    t,
    tBilling,
    activeOrgId,
    transactions,
    isLoading,
    loadError,
    selectedInvoice,
    setSelectedInvoice,
    isInvoiceOpen,
    setIsInvoiceOpen
  } = useBillingHistory();

  const transactionColumns = React.useMemo<ColumnDef<Transaction, unknown>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("history.table.date")} />
        ),
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">
            {formatDateTime(row.getValue("created_at"), locale, { dateStyle: "long" })}
          </span>
        )
      },
      {
        accessorKey: "order_id",
        header: t("history.table.txId"),
        cell: ({ row }) => (
          <span className="font-mono text-xs whitespace-nowrap text-slate-500">
            {row.getValue("order_id")}
          </span>
        )
      },
      {
        accessorKey: "plan_name",
        header: t("history.table.planName"),
        cell: ({ row }) => (
          <Badge variant="outline" className="border-slate-200 font-semibold capitalize">
            {row.getValue("plan_name")}
          </Badge>
        )
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("history.table.amount")} />
        ),
        cell: ({ row }) => (
          <span className="font-bold whitespace-nowrap">
            {formatTransactionAmount(
              row.original.amount,
              row.original.currency,
              row.original.amount_in_idr,
              locale
            )}
          </span>
        )
      },
      {
        accessorKey: "status",
        header: t("history.table.status"),
        cell: ({ row }) => (
          <Badge className="rounded-full border-emerald-500/10 bg-emerald-50 font-medium text-emerald-600 hover:bg-emerald-100/50">
            {String(row.getValue("status")).toUpperCase()}
          </Badge>
        )
      },
      {
        id: "actions",
        header: () => <span className="block text-end">{t("history.table.action")}</span>,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedInvoice(row.original);
                setIsInvoiceOpen(true);
              }}
              className="h-8 border-slate-200 text-xs font-semibold hover:bg-slate-50">
              {t("history.table.viewInvoice")}
            </Button>
          </div>
        )
      }
    ],
    [t, locale, setSelectedInvoice, setIsInvoiceOpen]
  );

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
          <AlertTitle>{t("alert.title")}</AlertTitle>
          <AlertDescription>{t("alert.desc")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4">
      {loadError && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("alert.title")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={transactionColumns}
        data={transactions}
        searchColumnId="order_id"
        labels={{
          searchPlaceholder: t("history.table.txId"),
          noResults: t("history.table.empty")
        }}
      />

      {/* DIALOG MODAL DETAIL INVOICE */}
      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-[550px] overflow-y-auto rounded-2xl border border-slate-200 p-6 sm:p-8">
          {selectedInvoice && (
            <div className="space-y-6">
              <div id="printable-invoice" className="space-y-6 print:p-0">
                <div className="flex items-start justify-between border-b border-slate-200 pb-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">
                      {t("invoice.title")}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      {t("invoice.id")}: #{selectedInvoice.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="text-end">
                    <h3 className="text-sm font-bold text-slate-900">
                      {t("invoice.prepaidService")}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t("invoice.date")}: {formatDateTime(selectedInvoice.created_at, locale)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-semibold tracking-wider text-slate-400 uppercase">
                      {t("invoice.billedTo")}:
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{t("invoice.orgId")}</p>
                    <p className="mt-0.5 font-mono break-all text-slate-400">
                      {selectedInvoice.tenant_id}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-semibold tracking-wider text-slate-400 uppercase">
                      {t("invoice.paymentMethod")}:
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {selectedInvoice.provider
                        ? selectedInvoice.provider.toUpperCase()
                        : "Gateway Payment"}
                    </p>
                    <p className="mt-0.5 break-all text-slate-400">
                      {t("invoice.refId")}: {selectedInvoice.order_id.slice(0, 15)}...
                    </p>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-500 uppercase">
                        <th className="px-4 py-3">{t("invoice.table.desc")}</th>
                        <th className="px-4 py-3 text-end">{t("invoice.table.total")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-900 capitalize">
                            {t("invoice.table.itemTitle", {
                              planName:
                                tBilling(`plans.${selectedInvoice.plan_name}.name`) ||
                                selectedInvoice.plan_name
                            })}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {t("invoice.table.itemDesc")}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-end text-sm font-bold text-slate-900">
                          {formatTransactionAmount(
                            selectedInvoice.amount,
                            selectedInvoice.currency,
                            selectedInvoice.amount_in_idr,
                            locale
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm font-bold">
                  <span className="text-slate-700">{t("invoice.totalPaid")}</span>
                  <span className="text-lg text-slate-950">
                    {formatTransactionAmount(
                      selectedInvoice.amount,
                      selectedInvoice.currency,
                      selectedInvoice.amount_in_idr,
                      locale
                    )}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400">
                  {t("invoice.footer")}
                </div>
              </div>

              <DialogFooter className="gap-2 border-t border-slate-100 pt-4 sm:gap-0 print:hidden">
                <Button
                  variant="outline"
                  onClick={() => setIsInvoiceOpen(false)}
                  className="rounded-xl">
                  {t("buttons.close")}
                </Button>
                <Button
                  onClick={() => {
                    window.print();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                  {t("buttons.print")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
