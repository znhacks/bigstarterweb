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
import { ArrowUpDown, Columns, MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";

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
import { generateAvatarFallback } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

// Impor fungsi utilitas tanggal
import { formatToUserTimezone, formatRelativeTime } from "@/lib/date";

// Impor klien Supabase & Global Language Hook
import { supabase } from "@/lib/supabase";
import { useTranslations, useLocale } from "next-intl";

// Impor konfigurasi plans lokal (Full Supabase Code-defined Plans)
import { plans } from "@/config/billing";

export type User = {
  id: number;
  dbId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: string;
  image: string;
  country: string;
  status: "active" | "inactive" | "pending";
  plan_name: string;
  lastSignIn?: string | null;
  created_at?: string;
  updated_at?: string;
};

const multiSelectFilterFn: FilterFn<any> = (row, columnId, filterValue: string[]) => {
  if (!filterValue || filterValue.length === 0) return true;
  const rowValue = String(row.getValue(columnId)).toLowerCase();
  return filterValue.map((v) => v.toLowerCase()).includes(rowValue);
};

// Fungsi getColumns menerima fungsi translasi `t`, `locale`, dan `timeZone`
export const getColumns = (t: any, locale: string, timeZone: string): ColumnDef<User>[] => [
  {
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
  },
  {
    accessorKey: "name",
    header: t("headers.name"),
    cell: ({ row }) => (
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src={row.original.image} alt={row.original.name} />
          <AvatarFallback>{generateAvatarFallback(row.getValue("name") || "U")}</AvatarFallback>
        </Avatar>
        <div className="text-foreground font-semibold capitalize">{row.getValue("name")}</div>
      </div>
    )
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t("headers.role")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <span className="capitalize">{row.getValue("role")}</span>,
    filterFn: multiSelectFilterFn
  },
  {
    accessorKey: "plan_name",
    header: ({ column }) => {
      return (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t("headers.plan")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <Badge variant="outline" className="font-semibold">
        {row.getValue("plan_name")}
      </Badge>
    ),
    filterFn: multiSelectFilterFn
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t("headers.email")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">{row.getValue("email")}</span>
    )
  },
  {
    accessorKey: "country",
    header: ({ column }) => {
      return (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t("headers.country")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => row.getValue("country")
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t("headers.status")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.original.status;
      const statusMap = {
        active: "success",
        inactive: "destructive",
        pending: "warning"
      } as const;
      const statusClass = statusMap[status] ?? "outline";
      return (
        <Badge variant={statusClass} className="capitalize">
          {status.replace("-", " ")}
        </Badge>
      );
    },
    filterFn: multiSelectFilterFn
  },
  {
    accessorKey: "lastSignIn",
    header: ({ column }) => {
      return (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t("headers.lastSignIn")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue("lastSignIn") as string | null;
      if (!value) return <span className="text-muted-foreground text-xs">-</span>;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{formatRelativeTime(value, locale)}</span>
          <span className="text-muted-foreground text-[10px]">
            {formatToUserTimezone(value, timeZone, locale)}
          </span>
        </div>
      );
    }
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t("headers.createdAt")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue("created_at") as string;
      if (!value) return <span className="text-muted-foreground text-xs">-</span>;
      return (
        <span className="text-muted-foreground text-xs">
          {formatToUserTimezone(value, timeZone, locale)}
        </span>
      );
    }
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => {
      return (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t("headers.updatedAt")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue("updated_at") as string;
      if (!value) return <span className="text-muted-foreground text-xs">-</span>;
      return (
        <span className="text-muted-foreground text-xs">
          {formatToUserTimezone(value, timeZone, locale)}
        </span>
      );
    }
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row, table }) => {
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
            <DropdownMenuItem className="cursor-pointer">{t("actions.view")}</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => meta?.onDeleteRow(row.original.dbId)}
              className="text-destructive focus:text-destructive cursor-pointer">
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
];

export default function UsersDataTable({ data: initialData }: { data?: User[] }) {
  const t = useTranslations("superadmin.users.data-table");
  const locale = useLocale();

  const [users, setUsers] = useState<User[]>(initialData || []);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [timeZone, setTimeZone] = useState("UTC");

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Mendapatkan zona waktu lokal pengguna di sisi klien
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const resolvedZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (resolvedZone) {
          setTimeZone(resolvedZone);
        }
      } catch (e) {
        console.warn("Gagal mendapatkan zona waktu sistem, menggunakan UTC sebagai fallback.", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      loadUsersFromSupabase();
    }
  }, [initialData]);

  const loadUsersFromSupabase = async () => {
    setIsLoading(true);
    try {
      // PERBAIKAN: Hanya mengambil plan_id dari tabel subscriptions, tidak memanggil tabel plans yang tidak ada
      const { data, error } = await supabase.from("profiles").select(`
          id,
          full_name,
          avatar,
          created_at,
          updated_at,
          last_sign_in,
          memberships (
            role,
            tenants (
              id,
              name,
              subscriptions (
                status,
                plan_id
              )
            )
          )
        `);

      if (error) throw error;

      const formatted: User[] = (data || []).map((prof: any, index: number) => {
        const fullName = prof.full_name || "Unknown User";
        const firstMembership = prof.memberships?.[0];
        const tenant = firstMembership?.tenants;
        const firstSub = tenant?.subscriptions?.[0];

        // PERBAIKAN: Cari nama paket dari file config/billing.ts lokal berdasarkan plan_id
        const localPlan = plans.find((p) => p.id === firstSub?.plan_id);
        const planName = localPlan ? localPlan.name : "Free";

        const statusVal = firstSub?.status === "active" ? "active" : "inactive";

        return {
          id: index + 1,
          dbId: prof.id,
          firstName: fullName.split(" ")[0] || "",
          lastName: fullName.split(" ").slice(1).join(" ") || "",
          name: fullName,
          role: firstMembership?.role || "Member",
          email: `${fullName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
          country: "United States",
          plan_name: planName,
          status: statusVal as "active" | "inactive" | "pending",
          image: prof.avatar || `https://i.pravatar.cc/150?img=${(index % 70) + 1}`,
          created_at: prof.created_at,
          updated_at: prof.updated_at,
          lastSignIn: prof.last_sign_in || null
        };
      });

      setUsers(formatted);
    } catch (e) {
      console.error("Gagal memuat pengguna dari Supabase:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRow = async (userId: string) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await supabase.from("memberships").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.dbId !== userId));
    } catch (error) {
      console.error("Gagal menghapus pengguna:", error);
    }
  };

  // Memasukkan `locale` dan `timeZone` ke dalam dependency array useMemo
  const memoizedColumns = useMemo(() => getColumns(t, locale, timeZone), [t, locale, timeZone]);

  const table = useReactTable({
    data: users,
    columns: memoizedColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection
    },
    meta: {
      onDeleteRow: handleDeleteRow
    }
  });

  const handleStatusToggle = (value: string) => {
    const updated = selectedStatuses.includes(value)
      ? selectedStatuses.filter((v) => v !== value)
      : [...selectedStatuses, value];
    setSelectedStatuses(updated);
    table.getColumn("status")?.setFilterValue(updated.length > 0 ? updated : undefined);
  };

  const handlePlanToggle = (value: string) => {
    const updated = selectedPlans.includes(value)
      ? selectedPlans.filter((v) => v !== value)
      : [...selectedPlans, value];
    setSelectedPlans(updated);
    table.getColumn("plan_name")?.setFilterValue(updated.length > 0 ? updated : undefined);
  };

  const handleRoleToggle = (value: string) => {
    const updated = selectedRoles.includes(value)
      ? selectedRoles.filter((v) => v !== value)
      : [...selectedRoles, value];
    setSelectedRoles(updated);
    table.getColumn("role")?.setFilterValue(updated.length > 0 ? updated : undefined);
  };

  const statuses = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" }
  ];

  // List filter plan menyesuaikan dengan array plans Anda
  const plansList = [
    { value: "Free", label: "Free" },
    { value: "Starter", label: "Starter" },
    { value: "Pro", label: "Pro" },
    { value: "Enterprise", label: "Enterprise" }
  ];

  const roles = [
    { value: "Owner", label: "Owner" },
    { value: "Admin", label: "Admin" },
    { value: "Member", label: "Member" }
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 py-4">
        <div className="flex gap-2">
          <Input
            placeholder={t("filters.search")}
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="border-border/80 h-10 max-w-sm rounded-xl"
          />

          {/* POPOVER STATUS FILTER */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-border/80 h-10 rounded-xl">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("filters.status")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="border-border/80 w-52 rounded-xl border p-0">
              <Command>
                <CommandInput placeholder={t("filters.status")} className="h-9" />
                <CommandList>
                  <CommandEmpty>{t("filters.noStatus")}</CommandEmpty>
                  <CommandGroup>
                    {statuses.map((status) => (
                      <CommandItem
                        key={status.value}
                        value={status.value}
                        onSelect={() => handleStatusToggle(status.value)}>
                        <div className="flex w-full cursor-pointer items-center space-x-3 py-1">
                          <Checkbox
                            id={status.value}
                            checked={selectedStatuses.includes(status.value)}
                          />
                          <label
                            htmlFor={status.value}
                            className="cursor-pointer text-sm leading-none font-medium">
                            {status.label}
                          </label>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* POPOVER PLAN FILTER */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-border/80 h-10 rounded-xl">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("filters.plan")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="border-border/80 w-52 rounded-xl border p-0">
              <Command>
                <CommandInput placeholder={t("filters.plan")} className="h-9" />
                <CommandList>
                  <CommandEmpty>{t("filters.noPlan")}</CommandEmpty>
                  <CommandGroup>
                    {plansList.map((plan) => (
                      <CommandItem
                        key={plan.value}
                        value={plan.value}
                        onSelect={() => handlePlanToggle(plan.value)}>
                        <div className="flex w-full cursor-pointer items-center space-x-3 py-1">
                          <Checkbox id={plan.value} checked={selectedPlans.includes(plan.value)} />
                          <label
                            htmlFor={plan.value}
                            className="cursor-pointer text-sm leading-none font-medium">
                            {plan.label}
                          </label>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* POPOVER ROLE FILTER */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-border/80 h-10 rounded-xl">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("filters.role")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="border-border/80 w-52 rounded-xl border p-0">
              <Command>
                <CommandInput placeholder={t("filters.role")} className="h-9" />
                <CommandList>
                  <CommandEmpty>{t("filters.noRole")}</CommandEmpty>
                  <CommandGroup>
                    {roles.map((role) => (
                      <CommandItem
                        key={role.value}
                        value={role.value}
                        onSelect={() => handleRoleToggle(role.value)}>
                        <div className="flex w-full cursor-pointer items-center space-x-3 py-1">
                          <Checkbox id={role.value} checked={selectedRoles.includes(role.value)} />
                          <label
                            htmlFor={role.value}
                            className="cursor-pointer text-sm leading-none font-medium">
                            {role.label}
                          </label>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-border/80 ml-auto h-10 rounded-xl">
              <Columns className="mr-2 h-4 w-4" />{" "}
              <span className="hidden md:inline">{t("filters.columns")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="cursor-pointer capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(value)}>
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="border-border/80 bg-card overflow-hidden rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-12">
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-accent/5">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={memoizedColumns.length}
                  className="text-muted-foreground h-24 text-center">
                  {t("footer.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 pt-4">
        <div className="text-muted-foreground flex-1 text-xs">
          {t("footer.selected", {
            selected: table.getFilteredSelectedRowModel().rows.length,
            total: table.getFilteredRowModel().rows.length
          })}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-border/80 rounded-xl">
            {t("footer.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-border/80 rounded-xl">
            {t("footer.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
