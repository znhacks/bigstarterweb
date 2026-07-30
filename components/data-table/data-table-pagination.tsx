"use client";

import * as React from "react";
import { Table as TanstackTable } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/i18n/format";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

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
  PaginationLink
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps<TData> {
  table: TanstackTable<TData>;
  pageSizeOptions?: number[];
  selectedLabel?: (selected: string, total: string) => string;
  rowsPerPageLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
  selectedLabel,
  rowsPerPageLabel,
  previousLabel,
  nextLabel
}: DataTablePaginationProps<TData>) {
  const locale = useLocale();
  const t = useTranslations("data-table.pagination");
  const selectedText =
    selectedLabel ??
    ((selected: string, total: string) =>
      t("selecteddata", {
        selected,
        total
      }));

  const rowsText = rowsPerPageLabel ?? t("rowsPerPage");
  const previousText = previousLabel ?? t("previous");
  const nextText = nextLabel ?? t("next");

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
          {formatNumber(pageIndex + 1, locale)}
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
        {selectedText(
          formatNumber(table.getFilteredSelectedRowModel().rows.length, locale),
          formatNumber(table.getFilteredRowModel().rows.length, locale)
        )}
      </div>

      <div className="order-1 flex w-full flex-col items-center justify-end gap-4 sm:flex-row md:order-2 md:w-auto">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs whitespace-nowrap">{rowsText}</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(val) => table.setPageSize(Number(val))}>
            <SelectTrigger className="border-border/80 h-8 w-[70px] rounded-lg text-xs">
              <SelectValue
                placeholder={formatNumber(table.getState().pagination.pageSize, locale)}
              />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`} className="text-xs">
                  {formatNumber(size, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {table.getPageCount() > 1 && (
          <Pagination>
            <PaginationContent className="flex-wrap gap-1">
              {}
              <PaginationItem>
                <PaginationLink
                  aria-label="Go to previous page"
                  size="default"
                  className={cn(
                    "cursor-pointer gap-1 rounded-lg px-2.5 text-xs sm:ps-2.5",
                    !table.getCanPreviousPage() && "pointer-events-none opacity-50"
                  )}
                  onClick={() => table.previousPage()}>
                  <ChevronLeftIcon className="h-4 w-4 rtl:-scale-x-100" />
                  <span className="hidden sm:block">{previousText}</span>
                </PaginationLink>
              </PaginationItem>

              {renderPaginationItems()}

              {}
              <PaginationItem>
                <PaginationLink
                  aria-label="Go to next page"
                  size="default"
                  className={cn(
                    "cursor-pointer gap-1 rounded-lg px-2.5 text-xs sm:pe-2.5",
                    !table.getCanNextPage() && "pointer-events-none opacity-50"
                  )}
                  onClick={() => table.nextPage()}>
                  <span className="hidden sm:block">{nextText}</span>
                  <ChevronRightIcon className="h-4 w-4 rtl:-scale-x-100" />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
