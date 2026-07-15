"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  TableMeta,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";

interface UseDataTableOptions<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  meta?: TableMeta<TData>;
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
  initialPageSize?: number;
  /** Turn off if you're doing server-side sorting/filtering/pagination yourself. */
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  pageCount?: number;
}

// Just the TanStack Table setup. Nothing about how it renders.
// Own this file — add/remove row models, plug in server-side pagination,
// whatever your case needs. It's a hook, not a black box.
export function useDataTable<TData, TValue>({
  columns,
  data,
  meta,
  initialSorting = [],
  initialColumnVisibility = {},
  initialPageSize = 10,
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  pageCount
}: UseDataTableOptions<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    meta,
    manualPagination,
    manualSorting,
    manualFiltering,
    pageCount,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    initialState: { pagination: { pageSize: initialPageSize } },
    state: { sorting, columnFilters, columnVisibility, rowSelection }
  });

  return table;
}
