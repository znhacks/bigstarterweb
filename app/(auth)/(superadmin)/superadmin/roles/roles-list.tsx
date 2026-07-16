"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteRole, updateRole } from "./actions";

import { useDataTable } from "@/components/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { EditableCell, ReadonlyCell } from "@/components/data-table/editable-cell";

export interface RoleRow {
  id: string;
  name: string;
  hierarchy_level: number;
  members_count: number;
  permissions_count: number;
}

export function RolesList({ rows: initialRows }: { rows: RoleRow[] }) {
  const t = useTranslations("superadmin.roles");
  const router = useRouter();
  const [rows, setRows] = React.useState(initialRows);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const goToDetail = (id: string) => router.push(`/superadmin/roles/${id}`);

  const handleDelete = async (id: string) => {
    if (!confirm(t("messages.confirmDelete"))) return;
    setPendingId(id);
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    const res = await deleteRole(fd);
    setPendingId(null);
    if (!res.success) setError(res.error);
    else setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // NOTE: assumes an `updateRole(FormData)` server action exists next to
  // `deleteRole` in "./actions", same shape: FormData in, { success, error? } out.
  const handleFieldCommit = async (
    id: string,
    field: "name" | "hierarchy_level",
    value: string | null
  ) => {
    setError(null);
    const prevRows = rows;

    // Optimistic update
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, [field]: field === "hierarchy_level" ? Number(value) || 0 : (value ?? "") }
          : r
      )
    );

    const fd = new FormData();
    fd.set("id", id);
    fd.set(field, value ?? "");
    const res = await updateRole(fd);
    if (!res.success) {
      setRows(prevRows); // revert on failure
      setError(res.error);
    }
  };

  // Columns are hardcoded for this feature — nothing generic about them.
  const columns: ColumnDef<RoleRow, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("list.name")} />,
      cell: ({ row }) => (
        <EditableCell
          value={row.original.name}
          displayValue={<span className="font-medium">{row.original.name}</span>}
          enabled
          editor="text"
          onCommit={(v) => handleFieldCommit(row.original.id, "name", v)}
          onView={() => goToDetail(row.original.id)}
        />
      )
    },
    {
      accessorKey: "hierarchy_level",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("list.hierarchy")} />,
      cell: ({ row }) => (
        <EditableCell
          value={String(row.original.hierarchy_level)}
          displayValue={<Badge variant="secondary">h{row.original.hierarchy_level}</Badge>}
          enabled
          editor="text"
          onCommit={(v) => handleFieldCommit(row.original.id, "hierarchy_level", v)}
          onView={() => goToDetail(row.original.id)}
        />
      )
    },
    {
      accessorKey: "members_count",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("list.members")} />,
      // Derived count, not directly editable — click still opens detail.
      cell: ({ row }) => (
        <ReadonlyCell
          displayValue={row.original.members_count}
          onView={() => goToDetail(row.original.id)}
        />
      )
    },
    {
      accessorKey: "permissions_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("list.permissions")} />
      ),
      cell: ({ row }) => (
        <ReadonlyCell
          displayValue={row.original.permissions_count}
          onView={() => goToDetail(row.original.id)}
        />
      )
    },
    {
      id: "actions",
      header: () => <div className="text-end">{t("list.actions")}</div>,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button asChild size="icon" variant="ghost">
            <Link href={`/superadmin/roles/${row.original.id}`} title={t("detail.edit")}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDelete(row.original.id)}
            disabled={pendingId === row.original.id}
            title={t("messages.delete")}>
            {pendingId === row.original.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="text-destructive h-4 w-4" />
            )}
          </Button>
        </div>
      )
    }
  ];

  // You own this instance — read/mutate it however this page needs.
  const table = useDataTable({ columns, data: rows });

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-destructive border-destructive/30 bg-destructive/10 rounded-lg border px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <DataTable table={table} columns={columns} noResultsText={t("list.empty")} />
    </div>
  );
}
