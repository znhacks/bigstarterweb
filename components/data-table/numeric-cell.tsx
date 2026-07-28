"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface NumericCellProps {
  value: number | string | null | undefined;
  /** Custom formatter (mis. formatCurrency). Default: toLocaleString. */
  format?: (v: number) => string;
  locale?: string;
  className?: string;
}

/**
 * Cell component untuk kolom numerik/currency di DataTable.
 * Otomatis rata kanan + font monospace + tabular-nums.
 *
 * **Cara pakai** di column def:
 * ```tsx
 * import { NumericCell } from "@/components/data-table/numeric-cell";
 *
 * {
 *   accessorKey: "amount",
 *   header: ({ column }) => <DataTableColumnHeader column={column} title="Jumlah" />,
 *   meta: { align: "right" },  // header juga rata kanan
 *   cell: ({ row }) => (
 *     <NumericCell
 *       value={row.original.amount}
 *       format={(v) => formatCurrency(v, "id", { currencyCode: "IDR" })}
 *     />
 *   ),
 * }
 * ```
 */
export function NumericCell({ value, format, locale = "en", className }: NumericCellProps) {
  if (value === null || value === undefined || value === "") {
    return (
      <div className={cn("text-right font-mono tabular-nums text-muted-foreground", className)}>
        -
      </div>
    );
  }

  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) {
    return <div className={cn("text-right text-muted-foreground", className)}>-</div>;
  }

  const formatted = format ? format(n) : n.toLocaleString(locale);

  return (
    <div className={cn("text-right font-mono tabular-nums", className)}>{formatted}</div>
  );
}
