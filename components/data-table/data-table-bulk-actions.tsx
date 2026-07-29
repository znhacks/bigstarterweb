"use client";

import * as React from "react";
import { Table as TanstackTable } from "@tanstack/react-table";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { formatNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

export type BulkActionTone = "default" | "warning" | "destructive";

export interface DataTableBulkAction<TData> {
  label: React.ReactNode;
  icon?: LucideIcon;
  tone?: BulkActionTone;
  separator?: boolean;
  disabled?: boolean | ((rows: TData[]) => boolean);
  onSelect: (rows: TData[]) => void;
}

interface DataTableBulkActionsProps<TData> {
  table: TanstackTable<TData>;
  actions: DataTableBulkAction<TData>[];
  label?: React.ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BulkActionTone, string> = {
  default: "",
  warning: "text-amber-600 focus:text-amber-600 dark:text-amber-500",
  destructive: "text-destructive focus:text-destructive"
};

export function DataTableBulkActions<TData>({
  table,
  actions,
  label = "Bulk actions",
  className
}: DataTableBulkActionsProps<TData>) {
  const locale = useLocale();
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedData = selectedRows.map((row) => row.original);
  const count = selectedRows.length;

  const isButtonDisabled = count === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isButtonDisabled}>
        <Button
          variant="outline"
          disabled={isButtonDisabled}
          className={cn("h-9 gap-1.5 border-dashed text-xs", className)}>
          {label}{" "}
          <Badge variant="secondary" className="h-4 min-w-4 justify-center px-1.5 py-0 text-[10px]">
            {formatNumber(count, locale)}
          </Badge>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const isDisabled =
            typeof action.disabled === "function"
              ? action.disabled(selectedData)
              : !!action.disabled;

          return (
            <React.Fragment key={index}>
              {action.separator && index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={isDisabled}
                onClick={() => action.onSelect(selectedData)}
                className={cn("cursor-pointer", TONE_CLASSES[action.tone ?? "default"])}>
                {Icon && <Icon className="me-2 h-4 w-4" />}
                {action.label}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
