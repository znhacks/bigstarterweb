"use client";

import * as React from "react";
import { Table as TanstackTable } from "@tanstack/react-table";
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

interface DataTablePaginationProps<TData> {
  table: TanstackTable<TData>;
  pageSizeOptions?: number[];
  selectedLabel?: (selected: number, total: number) => string;
  rowsPerPageLabel?: string;
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
  selectedLabel = (selected, total) => `${selected} of ${total} row(s) selected.`,
  rowsPerPageLabel = "Rows per page:"
}: DataTablePaginationProps<TData>) {
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

  return (
    <div className="flex flex-col items-center justify-between gap-4 pt-4 md:flex-row">
      <div className="text-muted-foreground order-2 text-xs md:order-1">
        {selectedLabel(
          table.getFilteredSelectedRowModel().rows.length,
          table.getFilteredRowModel().rows.length
        )}
      </div>

      <div className="order-1 flex w-full flex-col items-center justify-end gap-4 sm:flex-row md:order-2 md:w-auto">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {rowsPerPageLabel}
          </span>
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
  );
}
