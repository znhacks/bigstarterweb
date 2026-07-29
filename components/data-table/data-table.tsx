"use client";

import { ColumnDef, Table as TanstackTable, flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import "./data-table-meta";

interface DataTableProps<TData, TValue> {
  table: TanstackTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  noResultsText?: string;
  density?: "sm" | "default" | "lg";
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

export function DataTable<TData, TValue>({
  table,
  columns,
  noResultsText = "No results.",
  density = "default"
}: DataTableProps<TData, TValue>) {
  return (
    <div className="bg-card overflow-hidden rounded-md border">
      <Table>
        <colgroup>
          {table.getVisibleLeafColumns().map((column) => {
            const width = column.columnDef.meta?.width;
            return <col key={column.id} style={width !== undefined ? { width } : undefined} />;
          })}
        </colgroup>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const align = header.column.columnDef.meta?.align;
                return (
                  <TableHead
                    key={header.id}
                    className={cn(DENSITY_HEADER[density], align === "right" && "text-end")}>
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
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
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
                        DENSITY_CELL[density],
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
                colSpan={columns.length}
                className="text-muted-foreground h-24 text-center">
                {noResultsText}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
