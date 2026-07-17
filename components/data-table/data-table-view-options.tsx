"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Table as TanstackTable } from "@tanstack/react-table";
import { Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DataTableViewOptionsProps<TData> {
  table: TanstackTable<TData>;
  label?: string;
  className?: string;
  storageKey?: string;
}

export function DataTableViewOptions<TData>({
  table,
  label = "Columns",
  className,
  storageKey
}: DataTableViewOptionsProps<TData>) {
  const [isLoaded, setIsLoaded] = useState(false);

  const resolvedStorageKey = useMemo(() => {
    if (storageKey) return storageKey;
    const columnIds = table
      .getAllColumns()
      .map((c) => c.id)
      .sort()
      .join("-");
    return `table-visibility-${columnIds}`;
  }, [table, storageKey]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem(resolvedStorageKey);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          table.setColumnVisibility(parsed);
        } catch (error) {
          console.error("Gagal memulihkan status visibilitas kolom:", error);
        }
      }
      setIsLoaded(true);
    }
  }, [table, resolvedStorageKey]);

  const currentVisibility = table.getState().columnVisibility;
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem(resolvedStorageKey, JSON.stringify(currentVisibility));
    }
  }, [currentVisibility, resolvedStorageKey, isLoaded]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("h-9 text-xs", className)}>
          <Columns className="me-2 h-4 w-4" />
          <span className="hidden md:inline">{label}</span>
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
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
              // SOLUSI: Cegah aksi penutupan dropdown bawaan Radix UI saat item diklik
              onSelect={(event) => event.preventDefault()}>
              {(column.columnDef.meta as { label?: string })?.label ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
