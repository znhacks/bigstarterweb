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
import { ArrowUpDown, Columns, MoreHorizontal, PlusCircle, Loader2, Check } from "lucide-react";

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

// Impor klien Supabase & Global Language Hook
import { supabase } from "@/lib/supabase";
import { useLanguage, LanguageType } from "@/components/providers/language-provider";

export type User = {
  id: number;
  dbId: string; // Menyimpan ID UUID asli dari Supabase untuk fungsi aksi Hapus
  firstName: string;
  lastName: string;
  name: string; // Diperlukan sebagai accessor pencarian kolom nama
  email: string;
  role: string;
  image: string;
  country: string;
  status: "active" | "inactive" | "pending";
  plan_name: string;
};

// KAMUS TERJEMAHAN KHUSUS TABEL PENGGUNA (Mendukung 3 Bahasa)
const tableTranslations = {
  English: {
    headers: {
      name: "Name",
      role: "Role",
      plan: "Plan",
      email: "Email",
      country: "Country",
      status: "Status"
    },
    actions: {
      view: "View user",
      delete: "Delete"
    },
    filters: {
      search: "Search users...",
      status: "Status",
      plan: "Plan",
      role: "Role",
      columns: "Columns",
      noStatus: "No status found.",
      noPlan: "No plan found.",
      noRole: "No role found."
    },
    footer: {
      selected: "{selected} of {total} row(s) selected.",
      previous: "Previous",
      next: "Next",
      noResults: "No results."
    },
    confirmDelete: "Are you sure you want to delete this user?"
  },
  "Bahasa Indonesia": {
    headers: {
      name: "Nama",
      role: "Peran",
      plan: "Paket",
      email: "Email",
      country: "Negara",
      status: "Status"
    },
    actions: {
      view: "Lihat pengguna",
      delete: "Hapus"
    },
    filters: {
      search: "Cari pengguna...",
      status: "Status",
      plan: "Paket",
      role: "Peran",
      columns: "Kolom",
      noStatus: "Status tidak ditemukan.",
      noPlan: "Paket tidak ditemukan.",
      noRole: "Peran tidak ditemukan."
    },
    footer: {
      selected: "{selected} dari {total} baris dipilih.",
      previous: "Sebelumnya",
      next: "Berikutnya",
      noResults: "Tidak ada hasil."
    },
    confirmDelete: "Apakah Anda yakin ingin menghapus pengguna ini?"
  },
  Español: {
    headers: {
      name: "Nombre",
      role: "Rol",
      plan: "Plan",
      email: "Correo electrónico",
      country: "País",
      status: "Estado"
    },
    actions: {
      view: "Ver usuario",
      delete: "Eliminar"
    },
    filters: {
      search: "Buscar usuarios...",
      status: "Estado",
      plan: "Plan",
      role: "Rol",
      columns: "Columnas",
      noStatus: "No se encontró el estado.",
      noPlan: "No se encontró el plan.",
      noRole: "No se encontró el rol."
    },
    footer: {
      selected: "{selected} de {total} fila(s) seleccionadas.",
      previous: "Anterior",
      next: "Siguiente",
      noResults: "Sin resultados."
    },
    confirmDelete: "¿Está seguro de que desea eliminar a este usuario?"
  }
};

// Fungsi kustom untuk memproses filter berbasis array (multi-select)
const multiSelectFilterFn: FilterFn<any> = (row, columnId, filterValue: string[]) => {
  if (!filterValue || filterValue.length === 0) return true;
  const rowValue = String(row.getValue(columnId)).toLowerCase();
  return filterValue.map((v) => v.toLowerCase()).includes(rowValue);
};

// Generator Kolom Dinamis (Menerjemahkan tajuk kolom secara dinamis dan aman)
export const getColumns = (tTable: typeof tableTranslations.English): ColumnDef<User>[] => [
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
    header: tTable.headers.name,
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
          {tTable.headers.role}
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
          {tTable.headers.plan}
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
          {tTable.headers.email}
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
          {tTable.headers.country}
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
          {tTable.headers.status}
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
            <DropdownMenuItem className="cursor-pointer">{tTable.actions.view}</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => meta?.onDeleteRow(row.original.dbId)}
              className="text-destructive focus:text-destructive cursor-pointer">
              {tTable.actions.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
];

export default function UsersDataTable({ data: initialData }: { data?: User[] }) {
  const { language } = useLanguage();
  const tTable = tableTranslations[language] || tableTranslations["English"];

  const [users, setUsers] = useState<User[]>(initialData || []);
  const [isLoading, setIsLoading] = useState(!initialData);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // State untuk menyimpan daftar checkbox filter terpilih
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!initialData) {
      loadUsersFromSupabase();
    }
  }, [initialData]);

  // Memuat data secara dinamis dari database Supabase Anda
  const loadUsersFromSupabase = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("profiles").select(`
          id,
          full_name,
          avatar,
          memberships (
            role,
            tenants (
              id,
              name,
              subscriptions (
                status,
                plans (
                  name
                )
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

        const planName = firstSub?.plans?.name || "Free";
        const statusVal = firstSub?.status === "active" ? "active" : "inactive";

        return {
          id: index + 1,
          dbId: prof.id,
          firstName: fullName.split(" ")[0] || "",
          lastName: fullName.split(" ").slice(1).join(" ") || "",
          name: fullName,
          role: firstMembership?.role || "Member",
          plan_name: planName,
          email: `${fullName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
          country: "United States",
          status: statusVal as "active" | "inactive" | "pending",
          image: prof.avatar || `https://i.pravatar.cc/150?img=${(index % 70) + 1}`
        };
      });

      setUsers(formatted);
    } catch (e) {
      console.error("Gagal memuat pengguna dari Supabase:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler fungsi hapus baris langsung di database Supabase
  const handleDeleteRow = async (userId: string) => {
    if (!confirm(tTable.confirmDelete)) return;
    try {
      await supabase.from("memberships").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.dbId !== userId));
    } catch (error) {
      console.error("Gagal menghapus pengguna:", error);
    }
  };

  // Mengompilasi kolom secara reaktif dan hemat render menggunakan useMemo
  const memoizedColumns = useMemo(() => getColumns(tTable), [language]);

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

  // Handler Toggle Filter Status
  const handleStatusToggle = (value: string) => {
    const updated = selectedStatuses.includes(value)
      ? selectedStatuses.filter((v) => v !== value)
      : [...selectedStatuses, value];
    setSelectedStatuses(updated);
    table.getColumn("status")?.setFilterValue(updated.length > 0 ? updated : undefined);
  };

  // Handler Toggle Filter Plan
  const handlePlanToggle = (value: string) => {
    const updated = selectedPlans.includes(value)
      ? selectedPlans.filter((v) => v !== value)
      : [...selectedPlans, value];
    setSelectedPlans(updated);
    table.getColumn("plan_name")?.setFilterValue(updated.length > 0 ? updated : undefined);
  };

  // Handler Toggle Filter Role
  const handleRoleToggle = (value: string) => {
    const updated = selectedRoles.includes(value)
      ? selectedRoles.filter((v) => v !== value)
      : [...selectedRoles, value];
    setSelectedRoles(updated);
    table.getColumn("role")?.setFilterValue(updated.length > 0 ? updated : undefined);
  };

  // Data rujukan filter diselaraskan dengan database terdaftar Anda
  const statuses = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" }
  ];

  const plans = [
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
            placeholder={tTable.filters.search}
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="border-border/80 h-10 max-w-sm rounded-xl"
          />
          {/* POPOVER STATUS FILTER */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-border/80 h-10 rounded-xl">
                <PlusCircle className="mr-2 h-4 w-4" />
                {tTable.filters.status}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="border-border/80 w-52 rounded-xl border p-0">
              <Command>
                <CommandInput placeholder={tTable.filters.status} className="h-9" />
                <CommandList>
                  <CommandEmpty>{tTable.filters.noStatus}</CommandEmpty>
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
                {tTable.filters.plan}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="border-border/80 w-52 rounded-xl border p-0">
              <Command>
                <CommandInput placeholder={tTable.filters.plan} className="h-9" />
                <CommandList>
                  <CommandEmpty>{tTable.filters.noPlan}</CommandEmpty>
                  <CommandGroup>
                    {plans.map((plan) => (
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
                {tTable.filters.role}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="border-border/80 w-52 rounded-xl border p-0">
              <Command>
                <CommandInput placeholder={tTable.filters.role} className="h-9" />
                <CommandList>
                  <CommandEmpty>{tTable.filters.noRole}</CommandEmpty>
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
              <span className="hidden md:inline">{tTable.filters.columns}</span>
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
                  {tTable.footer.noResults}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 pt-4">
        <div className="text-muted-foreground flex-1 text-xs">
          {tTable.footer.selected
            .replace("{selected}", table.getFilteredSelectedRowModel().rows.length.toString())
            .replace("{total}", table.getFilteredRowModel().rows.length.toString())}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-border/80 rounded-xl">
            {tTable.footer.previous}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-border/80 rounded-xl">
            {tTable.footer.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
