"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  RowSelectionState,
  SortingState,
  TableMeta,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { Columns, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";

import { DataTableFacetedFilter, DataTableFacetedFilterOption } from "./data-table-faceted-filter";

// Generic filter fn for columns filtered by a list of selected values
// (e.g. status / role / plan). Attach via `filterFn: multiSelectFilterFn`
// on any ColumnDef whose id appears in `filterableColumns`.
export const multiSelectFilterFn: FilterFn<any> = (row, columnId, filterValue: string[]) => {
  if (!filterValue || filterValue.length === 0) return true;
  const rowValue = String(row.getValue(columnId)).toLowerCase();
  return filterValue.map((v) => v.toLowerCase()).includes(rowValue);
};

export interface DataTableFilterableColumn {
  id: string;
  title: string;
  options: DataTableFacetedFilterOption[];
  emptyText?: string;
}

export interface DataTableLabels {
  searchPlaceholder?: string;
  columnsLabel?: string;
  noResults?: string;
  selectedOf?: (selected: number, total: number) => string;
  rowsPerPage?: string;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  /** Column id to bind the search input to (search-on-Enter, like the button/loader pattern). */
  searchColumnId?: string;
  filterableColumns?: DataTableFilterableColumn[];
  pageSizeOptions?: number[];
  meta?: TableMeta<TData>;
  /** Extra buttons rendered in the toolbar, before the Columns dropdown. */
  toolbarExtra?: React.ReactNode;
  labels?: DataTableLabels;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  searchColumnId,
  filterableColumns = [],
  pageSizeOptions = [10, 20, 50, 100],
  meta,
  toolbarExtra,
  labels,
  className
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [searchVal, setSearchVal] = React.useState("");
  const [searching, setSearching] = React.useState(false);

  const {
    searchPlaceholder = "Search...",
    columnsLabel = "Columns",
    noResults = "No results.",
    selectedOf = (selected: number, total: number) => `${selected} of ${total} row(s) selected.`,
    rowsPerPage = "Rows per page:"
  } = labels || {};

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    meta
  });

  const handleSearchTrigger = () => {
    if (!searchColumnId) return;
    setSearching(true);
    table.getColumn(searchColumnId)?.setFilterValue(searchVal);
    setTimeout(() => setSearching(false), 300);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearchTrigger();
  };

  const renderPaginationItems = () => {
    const totalPages = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex;
    const items: React.ReactNode[] = [];

    const createPageItem = (pageIndex: number) => (
      <PaginationItem key={pageIndex}>
        <PaginationLink
          isActive={currentPage === pageIndex}
          onClick={() => table.setPageIndex(pageIndex)}
          className="cursor-pointer">
          {pageIndex + 1}
        </PaginationLink>
      </PaginationItem>
    );

    if (totalPages <= 5) {
      for (let i = 0; i < totalPages; i++) items.push(createPageItem(i));
    } else {
      items.push(createPageItem(0));

      if (currentPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);

      for (let i = start; i <= end; i++) items.push(createPageItem(i));

      if (currentPage < totalPages - 3) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      items.push(createPageItem(totalPages - 1));
    }

    return items;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={className ?? "w-full"}>
      <div className="flex flex-row flex-wrap items-center gap-2 py-4">
        {searchColumnId && (
          <div className="group relative max-w-sm flex-grow">
            <Input
              placeholder={searchPlaceholder}
              value={searchVal}
              onChange={(event) => setSearchVal(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-9 w-full pr-12"
            />
            <div className="absolute top-1/2 right-1 -translate-y-1/2">
              <Button
                onClick={handleSearchTrigger}
                disabled={searching}
                size="sm"
                className="h-8 w-8 p-0">
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {filterableColumns.map((fc) => (
          <DataTableFacetedFilter
            key={fc.id}
            column={table.getColumn(fc.id)}
            title={fc.title}
            options={fc.options}
            emptyText={fc.emptyText}
          />
        ))}

        {toolbarExtra}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 text-xs md:ms-auto">
              <Columns className="me-2 h-4 w-4" />
              <span className="hidden md:inline">{columnsLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="cursor-pointer capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-card overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-12">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
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
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4 text-xs">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center">
                  {noResults}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 pt-4 md:flex-row">
        <div className="text-muted-foreground order-2 text-xs md:order-1">
          {selectedOf(
            table.getFilteredSelectedRowModel().rows.length,
            table.getFilteredRowModel().rows.length
          )}
        </div>

        <div className="order-1 flex w-full flex-col items-center justify-end gap-4 sm:flex-row md:order-2 md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs whitespace-nowrap">{rowsPerPage}</span>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(val) => table.setPageSize(Number(val))}>
              <SelectTrigger className="border-border/80 h-8 w-[70px] rounded-lg text-xs">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={`${size}`} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {table.getPageCount() > 1 && (
            <Pagination>
              <PaginationContent className="flex-wrap gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    className={`cursor-pointer rounded-lg px-2 py-1 text-xs ${
                      !table.getCanPreviousPage() && "pointer-events-none opacity-50"
                    }`}
                    onClick={() => table.previousPage()}
                  />
                </PaginationItem>

                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext
                    className={`cursor-pointer rounded-lg px-2 py-1 text-xs ${
                      !table.getCanNextPage() && "pointer-events-none opacity-50"
                    }`}
                    onClick={() => table.nextPage()}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  );
}
