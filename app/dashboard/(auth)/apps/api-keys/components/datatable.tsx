"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  MoreHorizontal,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreateApiKeyDialog } from "./create-api-key-dialog";

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string | null;
  revoked_at: string | null;
}

function tenantId() {
  return typeof window !== "undefined" ? localStorage.getItem("active_org_id") : null;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

export function ApiKeysDataTable() {
  const [data, setData] = React.useState<ApiKey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const load = React.useCallback(async () => {
    const id = tenantId();
    if (!id) {
      toast.error("No active organization selected.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/api-keys", {
        headers: { "x-tenant-id": id },
        credentials: "include"
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Failed to load API keys.");
      setData(Array.isArray(json) ? (json as ApiKey[]) : []);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function revokeKey(key: ApiKey) {
    const id = tenantId();
    if (!id) return;
    if (!confirm(`Revoke "${key.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/v1/api-keys/${key.id}`, {
        method: "DELETE",
        headers: { "x-tenant-id": id },
        credentials: "include"
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Failed to revoke key.");
      toast.success("API key revoked.");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to revoke key.");
    }
  }

  const columns: ColumnDef<ApiKey>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>
    },
    {
      accessorKey: "key_prefix",
      header: "Key",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono">{row.original.key_prefix}…</span>
      )
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.created_at)
    },
    {
      accessorKey: "last_used_at",
      header: "Last used",
      cell: ({ row }) => formatDate(row.original.last_used_at)
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.revoked_at ? (
          <Badge variant="destructive">Revoked</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        )
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={!!row.original.revoked_at}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(row.original.key_prefix);
                  toast.success("Prefix copied (full key is hidden).");
                }}>
                <Copy className="mr-2 h-4 w-4" /> Copy prefix
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600!" onClick={() => revokeKey(row.original)}>
                <Trash2 className="text-red-600! mr-2 h-4 w-4" /> Revoke
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnVisibility, globalFilter }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <Input
          placeholder="Filter by name..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <CreateApiKeyDialog onCreated={load} />
      </div>
      <Card className="gap-0 p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-muted-foreground h-24 text-center">
                    No API keys yet. Create your first one to start using the API.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}>
          <ChevronLeft />
        </Button>
        <span className="text-muted-foreground text-sm">
          {table.getFilteredRowModel().rows.length} key(s)
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
