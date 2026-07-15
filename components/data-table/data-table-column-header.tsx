"use client";

import * as React from "react";
import { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn("text-xs", className)}>{title}</div>;
  }

  const isSorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      className={cn("-ms-3 text-xs", className)}
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
