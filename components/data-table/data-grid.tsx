"use client";

import * as React from "react";
import { ColumnDef, Table as TanstackTable, flexRender } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import "./data-table-meta"; // Meta untuk lebar kolom & penyejajaran teks

import { DataTableSearch } from "./data-table-search";
import { DataTableViewOptions } from "./data-table-view-options";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableBulkActions, type DataTableBulkAction } from "./data-table-bulk-actions";

export type DataGridDensity = "sm" | "default" | "lg";

interface DataGridContextValue {
  table: TanstackTable<any>;
  columns?: ColumnDef<any>[];
  density?: DataGridDensity;
  noResultsText?: string;
}

const DataGridContext = React.createContext<DataGridContextValue | null>(null);

export function useDataGridContext(): DataGridContextValue {
  const ctx = React.useContext(DataGridContext);
  if (!ctx) {
    throw new Error(
      "DataGrid sub-components (DataGridToolbar/DataGridSearch/DataGridViewOptions/DataGridTable/DataGridPagination/DataGridBulkActions) must be used within <DataGrid>."
    );
  }
  return ctx;
}

export interface DataGridProps<TData, TValue = unknown> {
  table: TanstackTable<TData>;
  columns?: ColumnDef<TData, TValue>[];
  density?: DataGridDensity;
  noResultsText?: string;
  children?: React.ReactNode;
}

/** Pembungkus utama Context Provider */
export function DataGrid<TData, TValue = unknown>({
  table,
  columns,
  density,
  noResultsText,
  children
}: DataGridProps<TData, TValue>) {
  const value = React.useMemo(
    () => ({ table, columns, density, noResultsText }) as DataGridContextValue,
    [table, columns, density, noResultsText]
  );

  return <DataGridContext.Provider value={value}>{children}</DataGridContext.Provider>;
}

/** Wrapper toolbar dengan layout fleksibel */
export function DataGridToolbar({
  className,
  children
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-row flex-wrap items-center gap-2", className)}>{children}</div>
  );
}

export function DataGridSearch({
  columnId,
  placeholder,
  className
}: {
  columnId: string;
  placeholder?: string;
  className?: string;
}) {
  const { table } = useDataGridContext();
  return (
    <DataTableSearch
      table={table}
      columnId={columnId}
      placeholder={placeholder}
      className={className}
    />
  );
}

export function DataGridViewOptions({
  label,
  className,
  storageKey
}: {
  label?: string;
  className?: string;
  storageKey?: string;
}) {
  const { table } = useDataGridContext();
  return (
    <DataTableViewOptions
      table={table}
      label={label}
      className={className}
      storageKey={storageKey}
    />
  );
}

const DENSITY_CELL: Record<string, string> = {
  sm: "py-2",
  default: "py-4",
  lg: "py-6"
};

const DENSITY_HEADER: Record<string, string> = {
  sm: "h-9",
  default: "h-12",
  lg: "h-14"
};

/**
 * Komponen Tabel Inti (Sebelumnya ada di data-table.tsx)
 * Sekarang langsung mengonsumsi context dari DataGrid.
 */
export function DataGridTable({
  density,
  noResultsText
}: {
  density?: DataGridDensity;
  noResultsText?: string;
}) {
  const ctx = useDataGridContext();
  if (!ctx.columns) {
    throw new Error("<DataGridTable> memerlukan prop `columns` yang diteruskan ke <DataGrid>.");
  }

  const activeDensity = density ?? ctx.density ?? "default";
  const activeNoResults = noResultsText ?? ctx.noResultsText ?? "No results.";

  return (
    <div className="bg-card overflow-hidden rounded-md border">
      <Table>
        <colgroup>
          {ctx.table.getVisibleLeafColumns().map((column) => {
            const width = column.columnDef.meta?.width;
            return <col key={column.id} style={width !== undefined ? { width } : undefined} />;
          })}
        </colgroup>
        <TableHeader>
          {ctx.table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const align = header.column.columnDef.meta?.align;
                return (
                  <TableHead
                    key={header.id}
                    className={cn(DENSITY_HEADER[activeDensity], align === "right" && "text-end")}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {ctx.table.getRowModel().rows?.length ? (
            ctx.table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="hover:bg-accent/5">
                {row.getVisibleCells().map((cell) => {
                  const align = cell.column.columnDef.meta?.align;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        DENSITY_CELL[activeDensity],
                        "text-xs",
                        align === "right" && "text-end tabular-nums"
                      )}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={ctx.columns.length}
                className="text-muted-foreground h-24 text-center">
                {activeNoResults}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function DataGridPagination({
  pageSizeOptions,
  selectedLabel,
  rowsPerPageLabel,
  previousLabel,
  nextLabel
}: {
  pageSizeOptions?: number[];
  selectedLabel?: (selected: string, total: string) => string;
  rowsPerPageLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
}) {
  const { table } = useDataGridContext();
  return (
    <DataTablePagination
      table={table}
      pageSizeOptions={pageSizeOptions}
      selectedLabel={selectedLabel}
      rowsPerPageLabel={rowsPerPageLabel}
      previousLabel={previousLabel}
      nextLabel={nextLabel}
    />
  );
}

export function DataGridBulkActions<TData>({
  table,
  actions,
  label,
  className
}: {
  table?: TanstackTable<TData>;
  actions: DataTableBulkAction<TData>[];
  label?: React.ReactNode;
  className?: string;
}) {
  const ctx = useDataGridContext();
  const resolvedTable = (table ?? ctx.table) as TanstackTable<TData>;
  return (
    <DataTableBulkActions
      table={resolvedTable}
      actions={actions}
      label={label}
      className={className}
    />
  );
}
