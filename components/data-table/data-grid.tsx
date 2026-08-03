"use client";
/**
 * data-grid.tsx — Sistem tabel compound. SEMUA komponen memakai nama DataGrid*.
 * Pintu import publik: @/components/data-table (barrel index.ts).
 *
 * Struktur pemakaian:
 * <DataGrid table={table} columns={columns}>
 *   <DataGridToolbar> ...search/filter/tools... </DataGridToolbar>
 *   <DataGridContent>
 *     <DataGridTable />
 *     <DataGridPagination />
 *   </DataGridContent>
 * </DataGrid>
 *
 * Semua anak DataGrid* WAJIB di dalam <DataGrid> (membaca instance table dari context).
 */

import * as React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  Row,
  RowSelectionState,
  SortingState,
  Table as TanstackTable,
  TableMeta,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns,
  Loader2,
  PlusCircle,
  Search,
  X,
  type LucideIcon
} from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "center" | "right";
    width?: number | string;
    label?: string;
  }
}

export type DataGridDensity = "xs" | "sm" | "default" | "lg";

const DENSITY_CELL: Record<string, string> = {
  xs: "py-1",
  sm: "py-2",
  default: "py-4",
  lg: "py-6"
};

const DENSITY_HEADER: Record<string, string> = {
  xs: "h-8",
  sm: "h-9",
  default: "h-12",
  lg: "h-14"
};

/* =========================================================================
 * Context & root
 * ========================================================================= */
interface DataGridContextValue {
  table: TanstackTable<any>;
  columns?: ColumnDef<any>[];
  density?: DataGridDensity;
  noResultsText?: string;
}

const DataGridContext = React.createContext<DataGridContextValue | null>(null);

export function useDataGridContext(): DataGridContextValue {
  const ctx = React.useContext(DataGridContext);
  if (!ctx) {
    throw new Error("Komponen DataGrid* harus dipakai di dalam <DataGrid>.");
  }
  return ctx;
}

export interface DataGridProps<TData, TValue = unknown> {
  table: TanstackTable<TData>;
  columns?: ColumnDef<TData, TValue>[];
  density?: DataGridDensity;
  noResultsText?: string;
  children?: React.ReactNode;
}

export function DataGrid<TData, TValue = unknown>({
  table,
  columns,
  density,
  noResultsText,
  children
}: DataGridProps<TData, TValue>) {
  const value = useMemo(
    () => ({ table, columns, density, noResultsText }) as DataGridContextValue,
    [table, columns, density, noResultsText]
  );
  return (
    <DataGridContext.Provider value={value}>
      <div className="space-y-3">{children}</div>
    </DataGridContext.Provider>
  );
}

/* =========================================================================
 * Hook: useDataGrid
 * ========================================================================= */
interface UseDataGridOptions<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  meta?: TableMeta<TData>;
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
  initialPageSize?: number;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  pageCount?: number;
  /** Filter function untuk global search. Default: "auto" TanStack. */
  globalFilterFn?: FilterFn<any>;
}

export function useDataGrid<TData, TValue>({
  columns,
  data,
  meta,
  initialSorting = [],
  initialColumnVisibility = {},
  initialPageSize = 10,
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  pageCount,
  globalFilterFn
}: UseDataGridOptions<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(initialColumnVisibility);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState<string>("");

  const table = useReactTable({
    data,
    columns,
    meta,
    manualPagination,
    manualSorting,
    manualFiltering,
    pageCount,
    globalFilterFn,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    initialState: { pagination: { pageSize: initialPageSize } },
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter }
  });

  return table;
}

/* =========================================================================
 * Filter & select helpers
 * ========================================================================= */
export const multiSelectFilterFn: FilterFn<any> = (row, columnId, filterValue: string[]) => {
  if (!filterValue || filterValue.length === 0) return true;
  const rowValue = String(row.getValue(columnId)).toLowerCase();
  return filterValue.map((v) => v.toLowerCase()).includes(rowValue);
};

export function createSelectColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false
  };
}

/* =========================================================================
 * Cells & header
 * ========================================================================= */
interface NumericCellProps {
  value: number | string | null | undefined;
  format?: (v: number) => string;
  locale?: string;
  className?: string;
}

export function NumericCell({ value, format, locale = "en", className }: NumericCellProps) {
  if (value === null || value === undefined || value === "") {
    return (
      <div className={cn("text-muted-foreground text-end font-mono tabular-nums", className)}>
        -
      </div>
    );
  }
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) {
    return <div className={cn("text-muted-foreground text-right", className)}>-</div>;
  }
  const formatted = format ? format(n) : n.toLocaleString(locale);
  return <div className={cn("text-end font-mono tabular-nums", className)}>{formatted}</div>;
}

interface DataGridColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataGridColumnHeader<TData, TValue>({
  column,
  title,
  className
}: DataGridColumnHeaderProps<TData, TValue>) {
  const align = (column.columnDef.meta as any)?.align as string | undefined;
  const alignClass = align === "right" ? "justify-end text-end w-full" : "";

  if (!column.getCanSort()) {
    return <div className={cn("text-xs", alignClass, className)}>{title}</div>;
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

type Editor = "text" | "select" | "date";

export interface SelectOption {
  value: string;
  label: string;
}

interface EditableCellProps {
  value: string | null | undefined;
  displayValue: React.ReactNode;
  enabled: boolean;
  editor: Editor;
  options?: SelectOption[];
  onCommit: (next: string | null) => void;
  onView: () => void;
  className?: string;
}

const NONE = "__none__";

export function EditableCell({
  value,
  displayValue,
  enabled,
  editor,
  options,
  onCommit,
  onView,
  className
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleClick = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      onView();
    }, 220);
  };

  const handleDoubleClick = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (enabled) setIsEditing(true);
  };

  if (isEditing && enabled) {
    return (
      <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        {editor === "text" && (
          <TextEditor
            value={value ?? ""}
            onCommit={(v) => {
              onCommit(v);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}
        {editor === "date" && (
          <DateEditor
            value={value ?? ""}
            onCommit={(v) => {
              onCommit(v);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}
        {editor === "select" && (
          <SelectEditor
            value={value ?? null}
            options={options}
            onCommit={(v) => {
              onCommit(v);
              setIsEditing(false);
            }}
            onClose={() => setIsEditing(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`cursor-pointer select-none ${className ?? ""}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}>
      {displayValue}
    </div>
  );
}

function TextEditor({
  value,
  onCommit,
  onCancel
}: {
  value: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <Input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(draft);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onCommit(draft)}
      className="h-8 text-xs"
    />
  );
}

function DateEditor({
  value,
  onCommit,
  onCancel
}: {
  value: string;
  onCommit: (v: string | null) => void;
  onCancel: () => void;
}) {
  const initial = toDateInputValue(value);
  const [draft, setDraft] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const commit = () => {
    if (!draft) onCommit(null);
    else onCommit(`${draft}T00:00:00.000Z`);
  };
  return (
    <Input
      ref={ref}
      type="date"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={commit}
      className="h-8 w-[150px] text-xs"
    />
  );
}

function SelectEditor({
  value,
  options,
  onCommit,
  onClose
}: {
  value: string | null;
  options?: SelectOption[];
  onCommit: (v: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Select
      defaultOpen
      value={value ?? NONE}
      onValueChange={(v) => onCommit(v === NONE ? null : v)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(options || []).map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function toDateInputValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ReadonlyCell({
  displayValue,
  onView,
  className
}: {
  displayValue: React.ReactNode;
  onView: () => void;
  className?: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleClick = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      onView();
    }, 220);
  }, [onView]);
  return (
    <div className={`cursor-pointer select-none ${className ?? ""}`} onClick={handleClick}>
      {displayValue}
    </div>
  );
}

/* =========================================================================
 * Column factories
 * ========================================================================= */
interface BaseOpts {
  header: string;
  width?: number;
  enableSorting?: boolean;
  enableHiding?: boolean;
  /** Ikut serta dalam global search? Default mengikuti default TanStack (aktif). */
  enableGlobalFilter?: boolean;
  filterFn?: FilterFn<any>;
}

interface SelectColOpts<T> extends Partial<Omit<BaseOpts, "header">> {
  header?: string;
  cell?: (row: T) => React.ReactNode;
}

export function selectCol<T>(opts?: SelectColOpts<T>): ColumnDef<T> {
  return {
    id: "select",
    header: opts?.header
      ? ({ column }) => <DataGridColumnHeader column={column} title={opts.header!} />
      : ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
    meta: { width: opts?.width, label: opts?.header || "Select" },
    enableSorting: opts?.enableSorting ?? false,
    enableHiding: opts?.enableHiding ?? false,
    enableGlobalFilter: false,
    cell: opts?.cell
      ? ({ row }) => opts.cell!(row.original as T)
      : ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        )
  };
}

interface TextColOpts<T> extends BaseOpts {
  key: string;
  cell?: (row: T) => React.ReactNode;
}

export function textCol<T>(opts: TextColOpts<T>): ColumnDef<T> {
  return {
    accessorKey: opts.key,
    header: ({ column }) => <DataGridColumnHeader column={column} title={opts.header} />,
    meta: { width: opts.width, label: opts.header },
    enableSorting: opts.enableSorting ?? true,
    enableHiding: opts.enableHiding ?? true,
    filterFn: opts.filterFn,
    enableGlobalFilter: opts.enableGlobalFilter,
    cell: opts.cell ? ({ row }) => opts.cell!(row.original as T) : undefined
  };
}

interface NumColOpts<T> extends BaseOpts {
  key: string;
  format?: (v: number) => string;
  locale?: string;
  cell?: (row: T) => React.ReactNode;
}

export function numCol<T>(opts: NumColOpts<T>): ColumnDef<T> {
  return {
    accessorKey: opts.key,
    header: ({ column }) => <DataGridColumnHeader column={column} title={opts.header} />,
    meta: { width: opts.width, align: "right", label: opts.header },
    enableSorting: opts.enableSorting ?? true,
    enableHiding: opts.enableHiding ?? true,
    filterFn: opts.filterFn,
    enableGlobalFilter: opts.enableGlobalFilter,
    cell: opts.cell
      ? ({ row }) => opts.cell!(row.original as T)
      : ({ row }) => {
          const value = (row.original as any)[opts.key];
          return <NumericCell value={value} format={opts.format} locale={opts.locale} />;
        }
  };
}

interface DateColOpts<T> extends BaseOpts {
  key: string;
  format?: (v: string | Date) => string;
  locale?: string;
  cell?: (row: T) => React.ReactNode;
}

export function dateCol<T>(opts: DateColOpts<T>): ColumnDef<T> {
  return {
    accessorKey: opts.key,
    header: ({ column }) => <DataGridColumnHeader column={column} title={opts.header} />,
    meta: { width: opts.width, align: "right", label: opts.header },
    enableSorting: opts.enableSorting ?? true,
    enableHiding: opts.enableHiding ?? true,
    filterFn: opts.filterFn,
    enableGlobalFilter: opts.enableGlobalFilter,
    cell: opts.cell
      ? ({ row }) => opts.cell!(row.original as T)
      : ({ row }) => {
          const raw = (row.original as any)[opts.key];
          if (!raw) return <div className="text-muted-foreground text-end">-</div>;
          const formatted = opts.format
            ? opts.format(raw)
            : new Date(raw).toLocaleDateString(opts.locale || "en", {
                year: "numeric",
                month: "short",
                day: "numeric"
              });
          return <div className="text-end tabular-nums">{formatted}</div>;
        }
  };
}

interface ActionColOpts<T> extends Omit<BaseOpts, "header"> {
  header?: string;
  cell: (row: T) => React.ReactNode;
}

export function actionCol<T>(opts: ActionColOpts<T>): ColumnDef<T> {
  return {
    id: "actions",
    header: opts.header
      ? ({ column }) => <DataGridColumnHeader column={column} title={opts.header!} />
      : undefined,
    meta: { width: opts.width, align: "right", label: opts.header },
    enableSorting: false,
    enableHiding: false,
    enableGlobalFilter: false,
    cell: ({ row }) => <div className="text-end">{opts.cell(row.original as T)}</div>
  };
}

/* =========================================================================
 * Toolbar (DataGridToolbar + tools)
 * ========================================================================= */
export function DataGridToolbar({
  className,
  children
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-row flex-wrap items-center gap-2", className)}>{children}</div>
  );
}

export function DataGridSearch({
  columnId,
  global: isGlobal,
  placeholder = "Search...",
  className
}: {
  /** Bila diisi (dan `global` tidak di-set), mencari per-kolom. */
  columnId?: string;
  /** Bila true, mencari lintas semua kolom yang aktif (global filter). */
  global?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const { table } = useDataGridContext();
  const [value, setValue] = useState("");
  const [searching, setSearching] = useState(false);

  const column = isGlobal ? undefined : table.getColumn(columnId!);
  const hasFilter = isGlobal ? !!table.getState().globalFilter : !!column?.getFilterValue();

  const applyFilter = (next: string) => {
    const v = next.trim() || undefined;
    if (isGlobal) table.setGlobalFilter(v);
    else column?.setFilterValue(v);
  };

  const trigger = () => {
    setSearching(true);
    applyFilter(value);
    setTimeout(() => setSearching(false), 300);
  };

  const clear = () => {
    setValue("");
    applyFilter("");
  };

  return (
    <div className={cn("relative max-w-sm flex-grow", className)}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (next === "") applyFilter("");
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

export interface DataGridFacetedFilterOption {
  value: string;
  label: string;
}

export function DataGridFacetedFilter({
  columnId,
  title,
  options,
  emptyText = "No results found."
}: {
  columnId: string;
  title: string;
  options: DataGridFacetedFilterOption[];
  emptyText?: string;
}) {
  const { table } = useDataGridContext();
  const column = table.getColumn(columnId);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>((column?.getFilterValue() as string[]) || []);
  const [temp, setTemp] = useState<string[]>(selected);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTemp(selected);
    } else {
      setSelected(temp);
      column?.setFilterValue(temp.length > 0 ? temp : undefined);
    }
    setOpen(next);
  };

  const toggle = (value: string) => {
    setTemp((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 text-xs">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ms-2 rounded-sm px-1 font-normal lg:hidden">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="border-border/80 w-52 rounded-xl border p-0" align="start">
        <Command>
          <CommandInput placeholder={title} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggle(option.value)}>
                  <div className="flex w-full cursor-pointer items-center gap-3 py-1">
                    <Checkbox
                      id={`${title}-${option.value}`}
                      checked={temp.includes(option.value)}
                      onCheckedChange={() => toggle(option.value)}
                    />
                    <label
                      htmlFor={`${title}-${option.value}`}
                      className="cursor-pointer text-sm leading-none font-medium">
                      {option.label}
                    </label>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function DataGridViewOptions({
  label = "Columns",
  className,
  storageKey
}: {
  label?: string;
  className?: string;
  storageKey?: string;
}) {
  const { table } = useDataGridContext();
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
          console.error("Failed to restore column visibility state:", error);
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
              onSelect={(event) => event.preventDefault()}>
              {column.columnDef.meta?.label ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type BulkActionTone = "default" | "warning" | "destructive";

export interface DataGridBulkAction<TData> {
  label: React.ReactNode;
  icon?: LucideIcon;
  tone?: BulkActionTone;
  separator?: boolean;
  disabled?: boolean | ((rows: TData[]) => boolean);
  onSelect: (rows: TData[]) => void;
}

const TONE_CLASSES: Record<BulkActionTone, string> = {
  default: "",
  warning: "text-amber-600 focus:text-amber-600 dark:text-amber-500",
  destructive: "text-destructive focus:text-destructive"
};

export function DataGridBulkActions<TData>({
  table,
  actions,
  label = "Bulk actions",
  className
}: {
  /** Opsional, untuk inferensi tipe `actions`. Default mengambil dari context. */
  table?: TanstackTable<TData>;
  actions: DataGridBulkAction<TData>[];
  label?: React.ReactNode;
  className?: string;
}) {
  const ctx = useDataGridContext();
  const resolvedTable = (table ?? ctx.table) as TanstackTable<TData>;
  const locale = useLocale();
  const selectedRows = resolvedTable.getFilteredSelectedRowModel().rows;
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

/* =========================================================================
 * Content (table + pagination wrapper)
 * ========================================================================= */
export function DataGridContent({
  className,
  children
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}

/* =========================================================================
 * Table & pagination
 * ========================================================================= */
export function DataGridTable({
  density,
  noResultsText,
  onRowClick,
  className
}: {
  density?: DataGridDensity;
  noResultsText?: string;
  /** Dipanggil saat baris diklik (menerima TanStack Row). */
  onRowClick?: (row: Row<any>) => void;
  className?: string;
}) {
  const ctx = useDataGridContext();
  if (!ctx.columns) {
    throw new Error("<DataGridTable> memerlukan `columns` yang diteruskan ke <DataGrid>.");
  }
  const d = density ?? ctx.density ?? "default";
  const noResults = noResultsText ?? ctx.noResultsText ?? "No results.";

  return (
    <div className={cn("bg-card overflow-hidden rounded-md border", className)}>
      <Table>
        <colgroup>
          {ctx.table.getVisibleLeafColumns().map((column) => {
            const width = column.columnDef.meta?.width;
            return <col key={column.id} style={width !== undefined ? { width } : undefined} />;
          })}
        </colgroup>
        <TableHeader>
          {ctx.table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const align = header.column.columnDef.meta?.align;
                return (
                  <TableHead
                    key={header.id}
                    className={cn(DENSITY_HEADER[d], align === "right" && "text-end")}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {ctx.table.getRowModel().rows?.length ? (
            ctx.table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn("hover:bg-accent/5", onRowClick && "cursor-pointer")}>
                {row.getVisibleCells().map((cell) => {
                  const align = cell.column.columnDef.meta?.align;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        DENSITY_CELL[d],
                        "text-xs",
                        align === "right" && "text-end tabular-nums"
                      )}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={ctx.columns.length}
                className="text-muted-foreground h-24 text-center">
                {noResults}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function DataGridPagination({
  pageSizeOptions = [10, 20, 50, 100],
  selectedLabel = (selected, total) => `${selected} of ${total} row(s) selected.`,
  rowsPerPageLabel = "Rows per page:",
  previousLabel = "Previous",
  nextLabel = "Next"
}: {
  pageSizeOptions?: number[];
  selectedLabel?: (selected: string, total: string) => string;
  rowsPerPageLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
}) {
  const { table } = useDataGridContext();
  const locale = useLocale();

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
    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
      <div className="text-muted-foreground order-2 text-xs md:order-1">
        {selectedLabel(
          formatNumber(table.getFilteredSelectedRowModel().rows.length, locale),
          formatNumber(table.getFilteredRowModel().rows.length, locale)
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
                  <span className="hidden sm:block">{previousLabel}</span>
                </PaginationLink>
              </PaginationItem>
              {renderPaginationItems()}
              <PaginationItem>
                <PaginationLink
                  aria-label="Go to next page"
                  size="default"
                  className={cn(
                    "cursor-pointer gap-1 rounded-lg px-2.5 text-xs sm:pe-2.5",
                    !table.getCanNextPage() && "pointer-events-none opacity-50"
                  )}
                  onClick={() => table.nextPage()}>
                  <span className="hidden sm:block">{nextLabel}</span>
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
