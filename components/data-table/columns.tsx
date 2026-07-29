"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "./data-table-column-header";
import { NumericCell } from "./numeric-cell";

interface BaseOpts {
  header: string;
  width?: number;
  enableSorting?: boolean;
  /** Bisa di-show/hide via DataTableViewOptions? Default true. */
  enableHiding?: boolean;
}

interface TextColOpts<T> extends BaseOpts {
  key: string;
  cell?: (row: T) => React.ReactNode;
}

export function textCol<T>(opts: TextColOpts<T>): ColumnDef<T> {
  return {
    accessorKey: opts.key,
    header: ({ column }) => <DataTableColumnHeader column={column} title={opts.header} />,
    meta: { width: opts.width, label: opts.header },
    enableSorting: opts.enableSorting ?? true,
    enableHiding: opts.enableHiding ?? true,
    cell: opts.cell ? ({ row }) => opts.cell!(row.original as T) : undefined
  };
}

interface NumColOpts<T> extends BaseOpts {
  key: string;
  format?: (v: number) => string;
  locale?: string;
  /** Override render default (NumericCell). meta.align/label tetap dari factory. */
  cell?: (row: T) => React.ReactNode;
}

export function numCol<T>(opts: NumColOpts<T>): ColumnDef<T> {
  return {
    accessorKey: opts.key,
    header: ({ column }) => <DataTableColumnHeader column={column} title={opts.header} />,
    meta: { width: opts.width, align: "right", label: opts.header },
    enableSorting: opts.enableSorting ?? true,
    enableHiding: opts.enableHiding ?? true,
    cell: opts.cell
      ? ({ row }) => opts.cell!(row.original as T)
      : ({ row }) => {
          const value = (row.original as any)[opts.key];
          return <NumericCell value={value} format={opts.format} locale={opts.locale} />;
        }
  };
}

interface DateColOpts<T> extends BaseOpts {
  key: string;
  format?: (v: string | Date) => string;
  locale?: string;
  /** Override render default. meta.align/label tetap dari factory. */
  cell?: (row: T) => React.ReactNode;
}

export function dateCol<T>(opts: DateColOpts<T>): ColumnDef<T> {
  return {
    accessorKey: opts.key,
    header: ({ column }) => <DataTableColumnHeader column={column} title={opts.header} />,
    meta: { width: opts.width, align: "right", label: opts.header },
    enableSorting: opts.enableSorting ?? true,
    enableHiding: opts.enableHiding ?? true,
    cell: opts.cell
      ? ({ row }) => opts.cell!(row.original as T)
      : ({ row }) => {
      const raw = (row.original as any)[opts.key];
      if (!raw) return <div className="text-muted-foreground text-end">-</div>;
      const formatted = opts.format
        ? opts.format(raw)
        : new Date(raw).toLocaleDateString(opts.locale || "en", {
            year: "numeric",
            month: "short",
            day: "numeric"
          });
      return <div className="text-end tabular-nums">{formatted}</div>;
    }
  };
}

interface ActionColOpts<T> extends Omit<BaseOpts, "header"> {
  header?: string;
  cell: (row: T) => React.ReactNode;
}

export function actionCol<T>(opts: ActionColOpts<T>): ColumnDef<T> {
  return {
    id: "actions",
    header: opts.header
      ? ({ column }) => <DataTableColumnHeader column={column} title={opts.header!} />
      : undefined,
    meta: { width: opts.width, align: "right", label: opts.header },
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <div className="text-end">{opts.cell(row.original as T)}</div>
  };
}
