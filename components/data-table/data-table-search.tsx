"use client";

import * as React from "react";
import { Table as TanstackTable } from "@tanstack/react-table";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DataTableSearchProps<TData> {
  table: TanstackTable<TData>;
  columnId: string;
  placeholder?: string;
  className?: string;
}

export function DataTableSearch<TData>({
  table,
  columnId,
  placeholder = "Search...",
  className
}: DataTableSearchProps<TData>) {
  const [value, setValue] = React.useState("");
  const [searching, setSearching] = React.useState(false);

  const column = table.getColumn(columnId);
  const hasFilter = !!column?.getFilterValue();

  const trigger = () => {
    setSearching(true);

    column?.setFilterValue(value.trim() || undefined);

    setTimeout(() => setSearching(false), 300);
  };

  const clear = () => {
    setValue("");
    column?.setFilterValue(undefined);
  };

  return (
    <div className={cn("relative max-w-sm flex-grow", className)}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);

          if (next === "") {
            column?.setFilterValue(undefined);
          }
        }}
        onKeyDown={(e) => e.key === "Enter" && trigger()}
        className="h-9 w-full pe-22"
      />

      <div className="absolute inset-y-0 end-1 flex items-center">
        {hasFilter && (
          <Button type="button" variant="ghost" size="icon" onClick={clear} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        )}

        <div className="bg-border mx-1 h-5 w-px" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={trigger}
          disabled={searching}
          className="h-7 w-7">
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
