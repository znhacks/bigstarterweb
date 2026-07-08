"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  FilterFn
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns,
  Download,
  Loader2,
  MoreHorizontal,
  PlusCircle,
  Search
} from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";

import { formatToUserTimezone, formatRelativeTime } from "@/lib/date";
import { useLocale, useTranslations } from "next-intl";
import type { Task, MemberOption, TaskProfile } from "./logic";
import type { SelectOption } from "./components/editable-cell";
import { EditableCell, ReadonlyCell } from "./components/editable-cell";
import { exportTasksToExcel } from "./export-tasks";

const STATUS_VALUES = ["todo", "in_progress", "done", "cancelled"] as const;
const PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;

// Pemetaan id kolom -> key terjemahan, untuk label dropdown "Columns".
const COLUMN_LABEL_KEYS: Record<string, string> = {
  title: "data-table.headers.title",
  status: "data-table.headers.status",
  priority: "data-table.headers.priority",
  assignee: "data-table.headers.assignee",
  due_date: "data-table.headers.dueDate",
  created_by: "data-table.headers.createdBy",
  created_at: "data-table.headers.createdAt",
  updated_at: "data-table.headers.updatedAt"
};

const multiSelectFilterFn: FilterFn<Task> = (row, columnId, filterValue: string[]) => {
  if (!filterValue || filterValue.length === 0) return true;
  const rowValue = String(row.getValue(columnId) ?? "").toLowerCase();
  return filterValue.map((v) => v.toLowerCase()).includes(rowValue);
};

const SortableHeader = ({ column, title }: { column: any; title: string }) => {
  const isSorted = column.getIsSorted();
  return (
    <Button
      className="-ms-3 text-xs"
      variant="ghost"
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
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "outline"> = {
  todo: "secondary",
  in_progress: "default",
  done: "success",
  cancelled: "outline"
};

const PRIORITY_VARIANT: Record<
  string,
  "outline" | "secondary" | "warning" | "destructive"
> = {
  low: "outline",
  medium: "secondary",
  high: "warning",
  urgent: "destructive"
};

function memberName(members: MemberOption[], id: string | null | undefined): string {
  if (!id) return "";
  return members.find((m) => m.id === id)?.name || id;
}
function profileName(p: TaskProfile | null | undefined, fallback = ""): string {
  return p?.full_name || fallback;
}

interface ColumnDeps {
  members: MemberOption[];
  statusOptions: SelectOption[];
  priorityOptions: SelectOption[];
  assigneeOptions: SelectOption[];
  canEditTask: (t: Task) => boolean;
}

function getColumns(
  t: any,
  locale: string,
  timeZone: string,
  deps: ColumnDeps
): ColumnDef<Task>[] {
  const {
    members,
    statusOptions,
    priorityOptions,
    assigneeOptions,
    canEditTask
  } = deps;

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
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
    },
    {
      accessorKey: "title",
      header: ({ column }) => <SortableHeader column={column} title={t("data-table.headers.title")} />,
      cell: ({ row, table }) => {
        const task = row.original;
        const meta = table.options.meta as any;
        return (
          <EditableCell
            value={task.title ?? ""}
            enabled={canEditTask(task)}
            editor="text"
            onCommit={(v) => meta?.onUpdate(task.id, { title: v })}
            onView={() => meta?.onView(task)}
            displayValue={
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground text-sm font-semibold">
                  {task.title || "—"}
                </span>
                {task.description ? (
                  <span className="text-muted-foreground line-clamp-1 max-w-[320px] text-[11px]">
                    {task.description}
                  </span>
                ) : null}
              </div>
            }
          />
        );
      }
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader column={column} title={t("data-table.headers.status")} />
      ),
      filterFn: multiSelectFilterFn,
      cell: ({ row, table }) => {
        const task = row.original;
        const meta = table.options.meta as any;
        const label = t(`data-table.statuses.${task.status}`);
        return (
          <EditableCell
            value={task.status}
            enabled={canEditTask(task)}
            editor="select"
            options={statusOptions}
            onCommit={(v) => meta?.onUpdate(task.id, { status: v ?? "todo" })}
            onView={() => meta?.onView(task)}
            displayValue={
              <Badge variant={STATUS_VARIANT[task.status] ?? "outline"}>{label}</Badge>
            }
          />
        );
      }
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <SortableHeader column={column} title={t("data-table.headers.priority")} />
      ),
      filterFn: multiSelectFilterFn,
      cell: ({ row, table }) => {
        const task = row.original;
        const meta = table.options.meta as any;
        const label = t(`data-table.priorities.${task.priority}`);
        return (
          <EditableCell
            value={task.priority}
            enabled={canEditTask(task)}
            editor="select"
            options={priorityOptions}
            onCommit={(v) => meta?.onUpdate(task.id, { priority: v ?? "medium" })}
            onView={() => meta?.onView(task)}
            displayValue={
              <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"}>{label}</Badge>
            }
          />
        );
      }
    },
    {
      id: "assignee",
      accessorFn: (row) => profileName(row.assignee, memberName(members, row.assignee_id)),
      header: ({ column }) => (
        <SortableHeader column={column} title={t("data-table.headers.assignee")} />
      ),
      filterFn: multiSelectFilterFn,
      cell: ({ row, table }) => {
        const task = row.original;
        const meta = table.options.meta as any;
        const name = profileName(task.assignee, memberName(members, task.assignee_id));
        const fallback = name ? name.charAt(0).toUpperCase() : "?";
        return (
          <EditableCell
            value={task.assignee_id ?? null}
            enabled={canEditTask(task)}
            editor="select"
            options={assigneeOptions}
            onCommit={(v) => meta?.onUpdate(task.id, { assignee_id: v })}
            onView={() => meta?.onView(task)}
            displayValue={
              name ? (
                <div className="flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarImage src={task.assignee?.avatar || undefined} alt={name} />
                    <AvatarFallback className="text-[10px]">{fallback}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {t("data-table.filters.unassigned")}
                </span>
              )
            }
          />
        );
      }
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <SortableHeader column={column} title={t("data-table.headers.dueDate")} />
      ),
      cell: ({ row, table }) => {
        const task = row.original;
        const meta = table.options.meta as any;
        const value = task.due_date;
        return (
          <EditableCell
            value={value ?? ""}
            enabled={canEditTask(task)}
            editor="date"
            onCommit={(v) => meta?.onUpdate(task.id, { due_date: v })}
            onView={() => meta?.onView(task)}
            displayValue={
              value ? (
                <span className="text-xs">{formatToUserTimezone(value, timeZone, locale)}</span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )
            }
          />
        );
      }
    },
    {
      id: "created_by",
      accessorFn: (row) => profileName(row.creator, memberName(members, row.created_by)),
      header: ({ column }) => (
        <SortableHeader column={column} title={t("data-table.headers.createdBy")} />
      ),
      cell: ({ row, table }) => {
        const task = row.original;
        const meta = table.options.meta as any;
        const name = profileName(task.creator, memberName(members, task.created_by));
        return (
          <ReadonlyCell
            displayValue={
              name ? (
                <span className="text-xs">{name}</span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )
            }
            onView={() => meta?.onView(task)}
          />
        );
      }
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <SortableHeader column={column} title={t("data-table.headers.createdAt")} />
      ),
      cell: ({ row, table }) => {
        const value = row.getValue("created_at") as string | null;
        const meta = table.options.meta as any;
        return (
          <ReadonlyCell
            displayValue={
              value ? (
                <span className="text-muted-foreground text-xs">
                  {formatRelativeTime(value, locale)}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )
            }
            onView={() => meta?.onView(row.original)}
          />
        );
      }
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => (
        <SortableHeader column={column} title={t("data-table.headers.updatedAt")} />
      ),
      cell: ({ row, table }) => {
        const value = row.getValue("updated_at") as string | null;
        const meta = table.options.meta as any;
        return (
          <ReadonlyCell
            displayValue={
              value ? (
                <span className="text-muted-foreground text-xs">
                  {formatToUserTimezone(value, timeZone, locale)}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )
            }
            onView={() => meta?.onView(row.original)}
          />
        );
      }
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row, table }) => {
        const task = row.original;
        const meta = table.options.meta as any;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => meta?.onView(task)}>
                {t("data-table.actions.view")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={() => meta?.onDelete(task)}>
                {t("data-table.actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];
}

interface TasksDataTableProps {
  tasks: Task[];
  members: MemberOption[];
  orgName: string;
  canCreate: boolean;
  canDelete: boolean;
  canEditTask: (t: Task) => boolean;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onView: (task: Task) => void;
  onDelete: (task: Task) => void;
  onCreateClick: () => void;
}

export function TasksDataTable({
  tasks,
  members,
  orgName,
  canCreate,
  canDelete,
  canEditTask,
  onUpdate,
  onView,
  onDelete,
  onCreateClick
}: TasksDataTableProps) {
  const t = useTranslations("tasks");
  const locale = useLocale();
  const [timeZone, setTimeZone] = useState("UTC");

  const [sorting, setSorting] = React.useState<SortingState>([{ id: "created_at", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Filter facet state (apply-on-close).
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [tempStatuses, setTempStatuses] = useState<string[]>([]);
  const [tempPriorities, setTempPriorities] = useState<string[]>([]);
  const [tempAssignees, setTempAssignees] = useState<string[]>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  const [searchVal, setSearchVal] = useState("");
  const [searching, setSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (z) setTimeZone(z);
      } catch {
        /* fallback UTC */
      }
    }
  }, []);

  const statusOptions: SelectOption[] = useMemo(
    () => STATUS_VALUES.map((v) => ({ value: v, label: t(`data-table.statuses.${v}`) })),
    [t]
  );
  const priorityOptions: SelectOption[] = useMemo(
    () => PRIORITY_VALUES.map((v) => ({ value: v, label: t(`data-table.priorities.${v}`) })),
    [t]
  );
  // Opsi filter assignee: pakai nama (konsisten dgn accessorFn). Dedupe by nama.
  const assigneeFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: SelectOption[] = [];
    for (const m of members) {
      if (m.name && !seen.has(m.name)) {
        seen.add(m.name);
        out.push({ value: m.name, label: m.name });
      }
    }
    return out;
  }, [members]);
  // Opsi editor assignee: pakai id.
  const assigneeEditOptions: SelectOption[] = useMemo(
    () => members.map((m) => ({ value: m.id, label: m.name })),
    [members]
  );

  const memoizedColumns = useMemo(
    () =>
      getColumns(t, locale, timeZone, {
        members,
        statusOptions,
        priorityOptions,
        assigneeOptions: assigneeEditOptions,
        canEditTask
      }),
    [t, locale, timeZone, members, statusOptions, priorityOptions, assigneeEditOptions, canEditTask]
  );

  const table = useReactTable({
    data: tasks,
    columns: memoizedColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    meta: { onView, onUpdate, onDelete }
  });

  // ---------- Search ----------
  const handleSearchTrigger = () => {
    setSearching(true);
    table.getColumn("title")?.setFilterValue(searchVal);
    setTimeout(() => setSearching(false), 250);
  };
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearchTrigger();
  };

  // ---------- Facet handlers (apply on close) ----------
  const makeOpenHandler = (
    field: "status" | "priority" | "assignee",
    open: boolean
  ) => {
    if (open) {
      if (field === "status") setTempStatuses(selectedStatuses);
      if (field === "priority") setTempPriorities(selectedPriorities);
      if (field === "assignee") setTempAssignees(selectedAssignees);
    } else {
      if (field === "status") {
        setSelectedStatuses(tempStatuses);
        table.getColumn("status")?.setFilterValue(tempStatuses.length ? tempStatuses : undefined);
        setStatusOpen(false);
      }
      if (field === "priority") {
        setSelectedPriorities(tempPriorities);
        table
          .getColumn("priority")
          ?.setFilterValue(tempPriorities.length ? tempPriorities : undefined);
        setPriorityOpen(false);
      }
      if (field === "assignee") {
        setSelectedAssignees(tempAssignees);
        table
          .getColumn("assignee")
          ?.setFilterValue(tempAssignees.length ? tempAssignees : undefined);
        setAssigneeOpen(false);
      }
      return;
    }
    if (field === "status") setStatusOpen(true);
    if (field === "priority") setPriorityOpen(true);
    if (field === "assignee") setAssigneeOpen(true);
  };

  const toggle = (
    field: "status" | "priority" | "assignee",
    value: string
  ) => {
    const setter =
      field === "status" ? setTempStatuses : field === "priority" ? setTempPriorities : setTempAssignees;
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  // ---------- Export ----------
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const rows = table.getFilteredRowModel().rows.map((r) => r.original);
      await exportTasksToExcel({
        rows,
        members,
        t: (key: string, values?: Record<string, unknown>) => t(key as any, values as any),
        locale,
        timeZone,
        orgName
      });
    } catch (e) {
      console.error("Gagal export tasks:", e);
    } finally {
      setIsExporting(false);
    }
  };

  // ---------- Pagination ----------
  const renderPaginationItems = () => {
    const totalPages = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex;
    const items = [];
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
      if (currentPage > 2)
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);
      for (let i = start; i <= end; i++) items.push(createPageItem(i));
      if (currentPage < totalPages - 3)
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      items.push(createPageItem(totalPages - 1));
    }
    return items;
  };

  const facetPopover = (
    field: "status" | "priority" | "assignee",
    open: boolean,
    label: string,
    options: SelectOption[],
    temp: string[],
    emptyKey: string
  ) => {
    const selectedArr =
      field === "status" ? selectedStatuses : field === "priority" ? selectedPriorities : selectedAssignees;
    return (
      <Popover open={open} onOpenChange={(o) => makeOpenHandler(field, o)}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 text-xs">
            <PlusCircle className="me-2 h-4 w-4" />
            {label}
            {selectedArr.length > 0 && (
              <Badge variant="secondary" className="ms-2 rounded-sm px-1 font-normal lg:hidden">
                {selectedArr.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0" align="start">
          <Command>
            <CommandInput placeholder={label} className="h-9" />
            <CommandList>
              <CommandEmpty>{t(emptyKey)}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem key={opt.value} value={opt.value} onSelect={() => toggle(field, opt.value)}>
                    <div className="flex w-full cursor-pointer items-center gap-3 py-1">
                      <Checkbox
                        checked={temp.includes(opt.value)}
                        onCheckedChange={() => toggle(field, opt.value)}
                      />
                      <label className="text-sm font-medium leading-none">{opt.label}</label>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="w-full">
      {/* TOOLBAR */}
      <div className="flex flex-row flex-wrap gap-4 py-4 md:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <div className="group relative max-w-sm flex-grow">
            <Input
              placeholder={t("data-table.filters.search")}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-9 w-full pe-12"
            />
            <div className="absolute end-1 top-1/2 -translate-y-1/2">
              <Button onClick={handleSearchTrigger} disabled={searching} size="sm" className="h-8 w-8 p-0">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {facetPopover(
            "status",
            statusOpen,
            t("data-table.filters.status"),
            statusOptions,
            tempStatuses,
            "data-table.filters.noStatus"
          )}
          {facetPopover(
            "priority",
            priorityOpen,
            t("data-table.filters.priority"),
            priorityOptions,
            tempPriorities,
            "data-table.filters.noPriority"
          )}
          {facetPopover(
            "assignee",
            assigneeOpen,
            t("data-table.filters.assignee"),
            assigneeFilterOptions,
            tempAssignees,
            "data-table.filters.noAssignee"
          )}
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Button onClick={handleExport} variant="outline" className="h-9 text-xs" disabled={isExporting || tasks.length === 0}>
            {isExporting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Download className="me-2 h-4 w-4" />}
            <span className="hidden sm:inline">{t("download")}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 text-xs">
                <Columns className="me-2 h-4 w-4" />
                <span className="hidden md:inline">{t("data-table.filters.columns")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((c) => c.getCanHide())
                .map((column) => {
                  const labelKey = COLUMN_LABEL_KEYS[column.id];
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="cursor-pointer"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                      {labelKey ? t(labelKey) : column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {canCreate && (
            <Button onClick={onCreateClick} className="h-9 text-xs">
              <PlusCircle className="me-2 h-4 w-4" />
              {t("newTask")}
            </Button>
          )}
        </div>
      </div>

      <p className="text-muted-foreground mb-2 text-xs">{t("data-table.editHint")}</p>

      {/* TABLE */}
      <div className="border-border/80 bg-card overflow-hidden rounded-xl border shadow-sm">
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
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-accent/5">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 text-xs align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={memoizedColumns.length} className="text-muted-foreground h-24 text-center">
                  {t("data-table.footer.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* FOOTER + PAGINATION */}
      <div className="flex flex-col items-center justify-between gap-4 pt-4 md:flex-row">
        <div className="text-muted-foreground order-2 text-xs md:order-1">
          {t("data-table.footer.selected", {
            selected: table.getFilteredSelectedRowModel().rows.length,
            total: table.getFilteredRowModel().rows.length
          })}
        </div>
        <div className="order-1 flex w-full flex-col items-center justify-end gap-4 sm:flex-row md:order-2 md:w-auto">
          <div className="flex items-center gap-2">
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(val) => table.setPageSize(Number(val))}>
              <SelectTrigger className="border-border/80 h-8 w-[70px] rounded-lg text-xs">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
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
                    className={`cursor-pointer rounded-lg px-2 py-1 text-xs ${!table.getCanPreviousPage() && "pointer-events-none opacity-50"}`}
                    onClick={() => table.previousPage()}
                  />
                </PaginationItem>
                {renderPaginationItems()}
                <PaginationItem>
                  <PaginationNext
                    className={`cursor-pointer rounded-lg px-2 py-1 text-xs ${!table.getCanNextPage() && "pointer-events-none opacity-50"}`}
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
