"use client";

import * as React from "react";
import { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className
}: DataTableColumnHeaderProps<TData, TValue>) {
  // Alignment via column meta (e.g., meta: { align: "right" } for numeric/currency columns).
  const align = (column.columnDef.meta as any)?.align as string | undefined;
  const alignClass = align === "right" ? "justify-end text-right w-full" : "";

  if (!column.getCanSort()) {
    return (
      <div className={cn("text-xs", alignClass, className)}>{title}</div>
    );
  }

  const isSorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      className={cn(
        "-ms-3 text-xs hover:bg-transparent hover:text-current focus-visible:bg-transparent active:bg-transparent",
        alignClass,
        className
      )}
      onClick={() => column.toggleSorting(isSorted === "asc")}>
      {title}
      {isSorted === "asc" ? (
        <ArrowUp className="ms-2 h-4 w-4" />
      ) : isSorted === "desc" ? (
        <ArrowDown className="ms-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ms-2 h-4 w-4" />
      )}
    </Button>
  );
}
