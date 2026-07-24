"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { ColumnDef, SortingFn } from "@tanstack/react-table";
import { Loader2, CreditCard, Columns, Download, MoreHorizontal, PlusCircle } from "lucide-react";
import type { FeatureGates } from "@/config/feature-definitions";
import { billingConfig } from "@/config/payment";
import { useTasks } from "./logic";
import type { Task, MemberOption, TaskProfile } from "./types";
import { exportTasksToExcel } from "./export-tasks";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatRelativeTime } from "@/lib/i18n/format";
import { compareStrings } from "@/lib/i18n/collator";
import { getLocaleMeta } from "@/config/i18n-culture";
import { DateTimePicker } from "@/components/date-time-picker";

// Reusable table pieces — the same ones every other table in the app uses.
import { useDataTable } from "@/components/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { createSelectColumn } from "@/components/data-table/data-table-select-column";
import { multiSelectFilterFn } from "@/components/data-table/data-table-filters";
import {
  EditableCell,
  ReadonlyCell,
  type SelectOption
} from "@/components/data-table/editable-cell";

const STATUS_VALUES = ["todo", "in_progress", "done", "cancelled"] as const;
const PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;
const NONE = "__none__";

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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "outline"> = {
  todo: "secondary",
  in_progress: "default",
  done: "success",
  cancelled: "outline"
};

const PRIORITY_VARIANT: Record<string, "outline" | "secondary" | "warning" | "destructive"> = {
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

const EMPTY_FORM = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assignee_id: "" as string,
  due_date: undefined as Date | undefined
};

interface TasksViewProps {
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  featureGates: FeatureGates;
  planName?: string | Record<string, string>;
}

export function TasksView({
  tenantSlug,
  tenantId,
  tenantName,
  featureGates,
  planName
}: TasksViewProps) {
  const h = useTasks({ tenantSlug, tenantId, tenantName }, { featureGates, planName });
  const { t, locale, timeZone, currentUsageCount } = h;

  const meta = getLocaleMeta(locale);

  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const openCreate = () => {
    if (h.isLimitReached) {
      setUpgradeDialogOpen(true);
      return;
    }
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (h.isLimitReached) {
      setCreateOpen(false);
      return;
    }
    if (!form.title.trim()) {
      setFormError(t("form.titleRequired"));
      return;
    }
    await h.createTask({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id || null,
      due_date: form.due_date ? form.due_date.toISOString() : null
    });
    setCreateOpen(false);
  };

  const memberNameOr = (id: string | null | undefined) =>
    id ? h.members.find((m) => m.id === id)?.name || id : t("detail.unassigned");

  const canCreate = h.canCreate && !h.isLimitReached;

  const statusOptions: SelectOption[] = useMemo(
    () => STATUS_VALUES.map((v) => ({ value: v, label: t(`data-table.statuses.${v}`) })),
    [t]
  );
  const priorityOptions: SelectOption[] = useMemo(
    () => PRIORITY_VALUES.map((v) => ({ value: v, label: t(`data-table.priorities.${v}`) })),
    [t]
  );

  const assigneeFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: SelectOption[] = [];
    for (const m of h.members) {
      if (m.name && !seen.has(m.name)) {
        seen.add(m.name);
        out.push({ value: m.name, label: m.name });
      }
    }
    return out;
  }, [h.members]);

  const assigneeEditOptions: SelectOption[] = useMemo(
    () => h.members.map((m) => ({ value: m.id, label: m.name })),
    [h.members]
  );

  const columns = useMemo<ColumnDef<Task, unknown>[]>(() => {
    const localeSortFn: SortingFn<Task> = (rowA, rowB, columnId) => {
      const valA = String(rowA.getValue(columnId) ?? "");
      const valB = String(rowB.getValue(columnId) ?? "");
      return compareStrings(valA, valB, locale);
    };

    return [
      createSelectColumn<Task>(),
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("data-table.headers.title")} />
        ),
        sortingFn: localeSortFn,
        cell: ({ row }) => {
          const task = row.original;
          return (
            <EditableCell
              value={task.title ?? ""}
              enabled={h.canEditTask(task)}
              editor="text"
              onCommit={(v) => h.updateTask(task.id, { title: v ?? "" })}
              onView={() => setDetailTask(task)}
              displayValue={
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground text-sm font-semibold">{task.title || "—"}</span>
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
          <DataTableColumnHeader column={column} title={t("data-table.headers.status")} />
        ),
        filterFn: multiSelectFilterFn,
        sortingFn: localeSortFn,
        cell: ({ row }) => {
          const task = row.original;
          const label = t(`data-table.statuses.${task.status}`);
          return (
            <EditableCell
              value={task.status}
              enabled={h.canEditTask(task)}
              editor="select"
              options={statusOptions}
              onCommit={(v) => h.updateTask(task.id, { status: v ?? "todo" })}
              onView={() => setDetailTask(task)}
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
          <DataTableColumnHeader column={column} title={t("data-table.headers.priority")} />
        ),
        filterFn: multiSelectFilterFn,
        sortingFn: localeSortFn,
        cell: ({ row }) => {
          const task = row.original;
          const label = t(`data-table.priorities.${task.priority}`);
          return (
            <EditableCell
              value={task.priority}
              enabled={h.canEditTask(task)}
              editor="select"
              options={priorityOptions}
              onCommit={(v) => h.updateTask(task.id, { priority: v ?? "medium" })}
              onView={() => setDetailTask(task)}
              displayValue={
                <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"}>{label}</Badge>
              }
            />
          );
        }
      },
      {
        id: "assignee",
        accessorFn: (row) => profileName(row.assignee, memberName(h.members, row.assignee_id)),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("data-table.headers.assignee")} />
        ),
        filterFn: multiSelectFilterFn,
        sortingFn: localeSortFn,
        cell: ({ row }) => {
          const task = row.original;
          const name = profileName(task.assignee, memberName(h.members, task.assignee_id));
          const fallback = name ? name.charAt(0).toUpperCase() : "?";
          return (
            <EditableCell
              value={task.assignee_id ?? null}
              enabled={h.canEditTask(task)}
              editor="select"
              options={assigneeEditOptions}
              onCommit={(v) => h.updateTask(task.id, { assignee_id: v })}
              onView={() => setDetailTask(task)}
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
          <DataTableColumnHeader column={column} title={t("data-table.headers.dueDate")} />
        ),
        cell: ({ row }) => {
          const task = row.original;
          const value = task.due_date;
          return (
            <EditableCell
              value={value ?? ""}
              enabled={h.canEditTask(task)}
              editor="date"
              onCommit={(v) => h.updateTask(task.id, { due_date: v })}
              onView={() => setDetailTask(task)}
              displayValue={
                value ? (
                  <span className="text-xs">
                    {formatDateTime(value, locale, { dateStyle: "medium", timeZone })}
                  </span>
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
        accessorFn: (row) => profileName(row.creator, memberName(h.members, row.created_by)),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("data-table.headers.createdBy")} />
        ),
        sortingFn: localeSortFn,
        cell: ({ row }) => {
          const task = row.original;
          const name = profileName(task.creator, memberName(h.members, task.created_by));
          return (
            <ReadonlyCell
              displayValue={
                name ? (
                  <span className="text-xs">{name}</span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )
              }
              onView={() => setDetailTask(task)}
            />
          );
        }
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("data-table.headers.createdAt")} />
        ),
        cell: ({ row }) => {
          const value = row.getValue("created_at") as string | null;
          return (
            <ReadonlyCell
              displayValue={
                value ? (
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeTime(value, locale, timeZone)}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )
              }
              onView={() => setDetailTask(row.original)}
            />
          );
        }
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("data-table.headers.updatedAt")} />
        ),
        cell: ({ row }) => {
          const value = row.getValue("updated_at") as string | null;
          return (
            <ReadonlyCell
              displayValue={
                value ? (
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeTime(value, locale, timeZone)}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )
              }
              onView={() => setDetailTask(row.original)}
            />
          );
        }
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const task = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={() => setDetailTask(task)}>
                  {t("data-table.actions.view")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => h.setTaskToDelete(task)}>
                  {t("data-table.actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }
      }
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    t,
    locale,
    timeZone,
    h.members,
    statusOptions,
    priorityOptions,
    assigneeEditOptions,
    h.canEditTask,
    h.updateTask,
    h.setTaskToDelete
  ]);

  const table = useDataTable({
    columns,
    data: h.tasks,
    initialSorting: [{ id: "created_at", desc: true }]
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const rows = table.getFilteredRowModel().rows.map((r) => r.original);
      const exportLocale = h.preferredLanguage || locale;
      await exportTasksToExcel({
        rows,
        members: h.members,
        locale: exportLocale,
        timeZone,
        orgName: tenantName
      });
    } catch (e) {
      console.error("Gagal export tasks:", e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8" dir={meta.dir}>
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>

        {/* Lencana Kuota Dinamis */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs">
            Plan: {h.planName} ({currentUsageCount}/{h.limit} Tasks)
          </Badge>
          {h.isLimitReached && (
            <Button size="sm" variant="destructive" onClick={() => setUpgradeDialogOpen(true)}>
              <CreditCard className="me-1.5 h-4 w-4" />
              Upgrade Now
            </Button>
          )}
        </div>
      </div>

      {/* Read-only banner */}
      {h.isReadOnly && (
        <Alert>
          <AlertTitle>{t("readOnly.title")}</AlertTitle>
          <AlertDescription>{t("readOnly.desc")}</AlertDescription>
        </Alert>
      )}

      {h.isLimitReached && (
        <Alert variant="destructive">
          <AlertTitle>Batas Kuota Tercapai</AlertTitle>
          <AlertDescription>
            Anda telah menggunakan {currentUsageCount} dari maksimal {h.limit} tugas untuk paket{" "}
            {h.planName}. Silakan tingkatkan paket Anda untuk melanjutkan pembuatan tugas.
          </AlertDescription>
        </Alert>
      )}

      {/* Alert hasil operasi */}
      {h.alertMessage && (
        <Alert variant={h.alertMessage.variant === "destructive" ? "destructive" : "default"}>
          <AlertTitle>{h.alertMessage.title}</AlertTitle>
          <AlertDescription>{h.alertMessage.description}</AlertDescription>
        </Alert>
      )}

      <div>
        {h.isLoading ? (
          <div className="flex min-h-100 items-center justify-center">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="w-full">
            {/* TOOLBAR */}
            <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <DataTableSearch
                  table={table}
                  columnId="title"
                  placeholder={t("data-table.filters.search")}
                  className="max-w-sm"
                />

                <DataTableFacetedFilter
                  column={table.getColumn("status")}
                  title={t("data-table.filters.status")}
                  options={statusOptions}
                  emptyText={t("data-table.filters.noStatus")}
                />

                <DataTableFacetedFilter
                  column={table.getColumn("priority")}
                  title={t("data-table.filters.priority")}
                  options={priorityOptions}
                  emptyText={t("data-table.filters.noPriority")}
                />

                <DataTableFacetedFilter
                  column={table.getColumn("assignee")}
                  title={t("data-table.filters.assignee")}
                  options={assigneeFilterOptions}
                  emptyText={t("data-table.filters.noAssignee")}
                />
              </div>

              <div className="ms-auto flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={isExporting || h.tasks.length === 0}>
                  {isExporting ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="me-2 h-4 w-4" />
                  )}
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
                  <Button onClick={openCreate} className="h-9 text-xs">
                    <PlusCircle className="me-2 h-4 w-4" />
                    {t("newTask")}
                  </Button>
                )}
              </div>
            </div>

            <p className="text-muted-foreground mb-2 text-xs">{t("data-table.editHint")}</p>

            <DataTable
              table={table}
              columns={columns}
              noResultsText={t("data-table.footer.noResults")}
            />

            <DataTablePagination
              table={table}
              selectedLabel={(selected, total) =>
                t("data-table.footer.selected", { selected, total })
              }
            />
          </div>
        )}
      </div>

      {/* DIALOG: PILIHAN GATEWAY PEMBAYARAN UNTUK UPGRADE */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md" dir={meta.dir}>
          <DialogHeader>
            <DialogTitle>Tingkatkan ke Paket Pro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-center">
            <p className="text-muted-foreground text-sm">
              Tingkatkan batas pembuatan tugas Anda menjadi <b>10.000 tugas</b> per bulan serta
              dapatkan dukungan prioritas.
            </p>

            <Button
              onClick={() => h.handleUpgrade(billingConfig.activeProvider)}
              disabled={h.isUpgrading}
              className="h-14 w-full rounded-xl bg-slate-950 text-base font-bold text-white hover:bg-slate-800">
              {h.isUpgrading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Menghubungkan ke gateway...
                </span>
              ) : (
                "Lanjutkan ke Pembayaran"
              )}
            </Button>

            {h.isUpgrading && (
              <div className="text-muted-foreground mt-2 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin" />
                Menghubungkan ke gateway pembayaran...
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              variant="ghost"
              onClick={() => setUpgradeDialogOpen(false)}
              disabled={h.isUpgrading}>
              Kembali ke Aplikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Create task */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-130" dir={meta.dir}>
          <DialogHeader>
            <DialogTitle>{t("form.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tk-title">{t("form.fields.title")}</Label>
              <Input
                id="tk-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("form.placeholders.title")}
              />
              {formError && <p className="text-destructive text-xs">{formError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tk-desc">{t("form.fields.description")}</Label>
              <Textarea
                id="tk-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("form.placeholders.description")}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("form.fields.status")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`data-table.statuses.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("form.fields.priority")}</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_VALUES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t(`data-table.priorities.${p}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("form.fields.assignee")}</Label>
                <Select
                  value={form.assignee_id || NONE}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, assignee_id: v === NONE ? "" : v }))
                  }>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("form.unassigned")}</SelectItem>
                    {h.members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col justify-end space-y-1.5">
                <Label className="mb-0.5">{t("form.fields.dueDate")}</Label>
                <DateTimePicker
                  date={form.due_date}
                  showTime={false}
                  setDate={(date) => setForm((f) => ({ ...f, due_date: date }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={h.isSaving}>
              {t("form.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={h.isSaving}>
              {h.isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("form.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Detail task */}
      <Dialog open={!!detailTask} onOpenChange={(o) => !o && setDetailTask(null)}>
        <DialogContent className="sm:max-w-140" dir={meta.dir}>
          <DialogHeader>
            <DialogTitle>{t("detail.title")}</DialogTitle>
          </DialogHeader>
          {detailTask && (
            <div className="space-y-4 py-2">
              <DetailField label={t("detail.fields.title")}>
                <span className="text-foreground font-semibold">{detailTask.title || "—"}</span>
              </DetailField>
              <DetailField label={t("detail.fields.description")}>
                <span className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {detailTask.description || t("detail.noDescription")}
                </span>
              </DetailField>
              <div className="grid grid-cols-2 gap-4">
                <DetailField label={t("detail.fields.status")}>
                  <Badge variant="secondary">{t(`data-table.statuses.${detailTask.status}`)}</Badge>
                </DetailField>
                <DetailField label={t("detail.fields.priority")}>
                  <Badge variant="outline">
                    {t(`data-table.priorities.${detailTask.priority}`)}
                  </Badge>
                </DetailField>
                <DetailField label={t("detail.fields.assignee")}>
                  <span className="text-sm">
                    {detailTask.assignee?.full_name || memberNameOr(detailTask.assignee_id)}
                  </span>
                </DetailField>
                <DetailField label={t("detail.fields.createdBy")}>
                  <span className="text-sm">
                    {detailTask.creator?.full_name || memberNameOr(detailTask.created_by)}
                  </span>
                </DetailField>

                <DetailField label={t("detail.fields.dueDate")}>
                  <span className="text-sm">
                    {detailTask.due_date
                      ? formatDateTime(detailTask.due_date, locale, { dateStyle: "long", timeZone })
                      : "—"}
                  </span>
                </DetailField>
                <DetailField label={t("detail.fields.createdAt")}>
                  <span className="text-muted-foreground text-sm">
                    {detailTask.created_at
                      ? formatDateTime(detailTask.created_at, locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone
                        })
                      : "—"}
                  </span>
                </DetailField>
                <DetailField label={t("detail.fields.updatedAt")}>
                  <span className="text-muted-foreground text-sm">
                    {detailTask.updated_at
                      ? formatDateTime(detailTask.updated_at, locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone
                        })
                      : "—"}
                  </span>
                </DetailField>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: Confirm delete */}
      <AlertDialog open={!!h.taskToDelete} onOpenChange={(o) => !o && h.setTaskToDelete(null)}>
        <AlertDialogContent dir={meta.dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("data-table.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {h.taskToDelete?.title ? `"${h.taskToDelete.title}"` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("form.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={h.confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("data-table.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <div>{children}</div>
    </div>
  );
}
