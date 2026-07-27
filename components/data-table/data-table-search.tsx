"use client";

import * as React from "react";
import { Table as TanstackTable } from "@tanstack/react-table";
import { Loader2, Search } from "lucide-react";
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

  const trigger = () => {
    setSearching(true);
    table.getColumn(columnId)?.setFilterValue(value);
    setTimeout(() => setSearching(false), 300);
  };

  return (
    <div className={cn("group relative max-w-sm flex-grow", className)}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && trigger()}
        className="h-9 w-full pr-12"
      />
      <div className="absolute top-1/2 right-1 -translate-y-1/2">
        <Button onClick={trigger} disabled={searching} size="sm" className="h-8 w-8 p-0">
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
