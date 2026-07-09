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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  MoreHorizontal,
  PlusCircle,
  Loader2,
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
import { generateAvatarFallback } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

// Impor komponen Select & Pagination dari Shadcn
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

// Impor fungsi utilitas tanggal
import { formatToUserTimezone, formatRelativeTime } from "@/lib/date";

// Impor klien Supabase & Global Language Hook
import { supabase } from "@/lib/supabase";
import { useTranslations, useLocale } from "next-intl";

// Impor konfigurasi plans lokal (Full Supabase Code-defined Plans)
import { plans } from "@/config/billing";

// Moderasi akun (soft-delete / ban) + komponen dialog
import {
  softDeleteUser,
  banUser,
  unbanUser
} from "@/app/(auth)/(superadmin)/superadmin/actions/account-moderation";
import { BAN_DURATIONS, DEFAULT_BAN_KEY, computeBannedUntil } from "@/config/moderation";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { RestoreDialog } from "@/components/restore-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

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
  // Status akun (moderasi): active | banned | deleted
  accountStatus?: "active" | "banned" | "deleted";
  bannedUntil?: string | null;
  bannedReason?: string | null;
};

const multiSelectFilterFn: FilterFn<any> = (row, columnId, filterValue: string[]) => {
  if (!filterValue || filterValue.length === 0) return true;
  const rowValue = String(row.getValue(columnId)).toLowerCase();
  return filterValue.map((v) => v.toLowerCase()).includes(rowValue);
};

// Komponen Pembantu untuk Header yang dapat diurutkan dengan panah dinamis
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
    cell: ({ row }) => {
      const acc = row.original.accountStatus;
      return (
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={row.original.image} alt={row.original.name} />
            <AvatarFallback>{generateAvatarFallback(row.getValue("name") || "U")}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <div className="text-foreground font-semibold capitalize">{row.getValue("name")}</div>
            {acc && acc !== "active" && (
              <Badge
                variant={acc === "banned" ? "destructive" : "secondary"}
                className="w-fit text-[10px]">
                {t(`accountStatus.${acc}`)}
              </Badge>
            )}
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: "role",
    header: ({ column }) => <SortableHeader column={column} title={t("headers.role")} />,
    cell: ({ row }) => <span className="capitalize">{row.getValue("role")}</span>,
    filterFn: multiSelectFilterFn
  },
  {
    accessorKey: "plan_name",
    header: ({ column }) => <SortableHeader column={column} title={t("headers.plan")} />,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-semibold">
        {row.getValue("plan_name")}
      </Badge>
    ),
    filterFn: multiSelectFilterFn
  },
  {
    accessorKey: "email",
    header: ({ column }) => <SortableHeader column={column} title={t("headers.email")} />,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">{row.getValue("email")}</span>
    )
  },
  {
    accessorKey: "country",
    header: ({ column }) => <SortableHeader column={column} title={t("headers.country")} />,
    cell: ({ row }) => row.getValue("country")
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column} title={t("headers.status")} />,
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
    header: ({ column }) => <SortableHeader column={column} title={t("headers.lastSignIn")} />,
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
    header: ({ column }) => <SortableHeader column={column} title={t("headers.createdAt")} />,
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
    header: ({ column }) => <SortableHeader column={column} title={t("headers.updatedAt")} />,
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
            {row.original.accountStatus === "banned" ? (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => meta?.onUnbanRow(row.original.dbId)}>
                {t("actions.unban")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => meta?.onBanRow(row.original)}>
                {t("actions.ban")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => meta?.onDeleteRow(row.original)}
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
  const tMod = useTranslations("moderation");
  const locale = useLocale();

  const [users, setUsers] = useState<User[]>(initialData || []);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [timeZone, setTimeZone] = useState("UTC");

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // State untuk melacak filter yang benar-benar aktif di tabel
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // State sementara untuk popover agar filter hanya berjalan saat popover ditutup (Apply on Close)
  const [tempStatuses, setTempStatuses] = useState<string[]>([]);
  const [tempPlans, setTempPlans] = useState<string[]>([]);
  const [tempRoles, setTempRoles] = useState<string[]>([]);

  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [planPopoverOpen, setPlanPopoverOpen] = useState(false);
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);

  // State pencarian lokal yang memerlukan tombol Enter
  const [searchVal, setSearchVal] = useState("");

  // Daftar role global (RBAC) untuk filter dropdown — DB-driven.
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);

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

  // Ambil daftar role global untuk dropdown filter
  useEffect(() => {
    supabase
      .from("roles")
      .select("name")
      .order("hierarchy_level", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setRoles(data.map((r: any) => ({ value: r.name, label: r.name })));
        }
      });
  }, []);

  const loadUsersFromSupabase = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("profiles").select(`
          id,
          full_name,
          avatar,
          created_at,
          updated_at,
          last_sign_in,
          status,
          banned_until,
          banned_reason,
          memberships (
            role_id,
            roles (
              name
            ),
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

        const localPlan = plans.find((p) => p.id === firstSub?.plan_id);
        const planName = localPlan ? localPlan.name : "Free";

        const statusVal = firstSub?.status === "active" ? "active" : "inactive";

        return {
          id: index + 1,
          dbId: prof.id,
          firstName: fullName.split(" ")[0] || "",
          lastName: fullName.split(" ").slice(1).join(" ") || "",
          name: fullName,
          role: firstMembership?.roles?.name || "Member",
          email: `${fullName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
          country: "United States",
          plan_name: planName,
          status: statusVal as "active" | "inactive" | "pending",
          image: prof.avatar || `https://i.pravatar.cc/150?img=${(index % 70) + 1}`,
          created_at: prof.created_at,
          updated_at: prof.updated_at,
          lastSignIn: prof.last_sign_in || null,
          accountStatus: (prof.status as User["accountStatus"]) || "active",
          bannedUntil: prof.banned_until || null,
          bannedReason: prof.banned_reason || null
        };
      });

      setUsers(formatted);
    } catch (e) {
      console.error("Gagal memuat pengguna dari Supabase:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Moderation state (soft-delete + ban) ----
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [banDuration, setBanDuration] = useState<string>(DEFAULT_BAN_KEY);
  const [banReason, setBanReason] = useState<string>("");
  const [banSaving, setBanSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const handleDeleteRow = (user: User) => setUserToDelete(user);

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteSaving(true);
    const res = await softDeleteUser(userToDelete.dbId);
    setDeleteSaving(false);
    if (res.error) {
      console.error("Gagal soft-delete user:", res.error);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.dbId !== userToDelete.dbId));
    setUserToDelete(null);
  };

  const handleBan = (user: User) => {
    setBanDuration(DEFAULT_BAN_KEY);
    setBanReason("");
    setUserToBan(user);
  };

  const confirmBan = async () => {
    if (!userToBan) return;
    setBanSaving(true);
    const res = await banUser({
      userId: userToBan.dbId,
      durationKey: banDuration,
      reason: banReason
    });
    setBanSaving(false);
    if (res.error) {
      console.error("Gagal ban user:", res.error);
      return;
    }
    const until = computeBannedUntil(banDuration);
    setUsers((prev) =>
      prev.map((u) =>
        u.dbId === userToBan.dbId
          ? {
              ...u,
              accountStatus: "banned",
              bannedUntil: until,
              bannedReason: banReason.trim() || null
            }
          : u
      )
    );
    setUserToBan(null);
  };

  const handleUnban = async (userId: string) => {
    const res = await unbanUser(userId);
    if (res.error) {
      console.error("Gagal unban user:", res.error);
      return;
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.dbId === userId
          ? { ...u, accountStatus: "active", bannedUntil: null, bannedReason: null }
          : u
      )
    );
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
      onDeleteRow: handleDeleteRow,
      onBanRow: handleBan,
      onUnbanRow: handleUnban
    }
  });

  // State untuk indikator loading pencarian
  const [loading, setLoading] = useState(false);

  // Fungsi untuk memicu pencarian ke dalam filter tabel
  const handleSearchTrigger = () => {
    setLoading(true);
    table.getColumn("name")?.setFilterValue(searchVal);
    // Memberikan jeda singkat untuk feedback visual loading
    setTimeout(() => {
      setLoading(false);
    }, 300);
  };

  // Modifikasi handler KeyDown agar memanggil handleSearchTrigger
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchTrigger();
    }
  };

  // Handler Status Popover (Menerapkan filter setelah Popover Ditutup)
  const handleStatusOpenChange = (open: boolean) => {
    if (open) {
      setTempStatuses(selectedStatuses);
    } else {
      setSelectedStatuses(tempStatuses);
      table.getColumn("status")?.setFilterValue(tempStatuses.length > 0 ? tempStatuses : undefined);
    }
    setStatusPopoverOpen(open);
  };

  const handleStatusToggle = (value: string) => {
    setTempStatuses((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  // Handler Paket Popover (Menerapkan filter setelah Popover Ditutup)
  const handlePlanOpenChange = (open: boolean) => {
    if (open) {
      setTempPlans(selectedPlans);
    } else {
      setSelectedPlans(tempPlans);
      table.getColumn("plan_name")?.setFilterValue(tempPlans.length > 0 ? tempPlans : undefined);
    }
    setPlanPopoverOpen(open);
  };

  const handlePlanToggle = (value: string) => {
    setTempPlans((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  // Handler Peran Popover (Menerapkan filter setelah Popover Ditutup)
  const handleRoleOpenChange = (open: boolean) => {
    if (open) {
      setTempRoles(selectedRoles);
    } else {
      setSelectedRoles(tempRoles);
      table.getColumn("role")?.setFilterValue(tempRoles.length > 0 ? tempRoles : undefined);
    }
    setRolePopoverOpen(open);
  };

  const handleRoleToggle = (value: string) => {
    setTempRoles((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const statuses = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" }
  ];

  const plansList = [
    { value: "Free", label: "Free" },
    { value: "Starter", label: "Starter" },
    { value: "Pro", label: "Pro" },
    { value: "Enterprise", label: "Enterprise" }
  ];

  // Helper untuk merender item halaman Paginasi Shadcn
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
      for (let i = 0; i < totalPages; i++) {
        items.push(createPageItem(i));
      }
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

      for (let i = start; i <= end; i++) {
        items.push(createPageItem(i));
      }

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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-row gap-4 py-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <div className="group relative max-w-sm flex-grow">
            <Input
              placeholder={`${t("filters.search")}`}
              value={searchVal}
              onChange={(event) => setSearchVal(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-9 w-full pr-12"
            />
            <div className="absolute top-1/2 right-1 -translate-y-1/2">
              <Button
                onClick={handleSearchTrigger}
                disabled={loading}
                size="sm"
                className="h-8 w-8 p-0">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* POPOVER STATUS FILTER */}
          <Popover open={statusPopoverOpen} onOpenChange={handleStatusOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 text-xs">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("filters.status")}
                {selectedStatuses.length > 0 && (
                  <Badge variant="secondary" className="ms-2 rounded-sm px-1 font-normal lg:hidden">
                    {selectedStatuses.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="start">
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
                        <div className="flex w-full cursor-pointer items-center gap-3 py-1">
                          <Checkbox
                            id={`status-${status.value}`}
                            checked={tempStatuses.includes(status.value)}
                            onCheckedChange={() => handleStatusToggle(status.value)}
                          />
                          <label
                            htmlFor={`status-${status.value}`}
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
          <Popover open={planPopoverOpen} onOpenChange={handlePlanOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 text-xs">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("filters.plan")}
                {selectedPlans.length > 0 && (
                  <Badge variant="secondary" className="ms-2 rounded-sm px-1 font-normal lg:hidden">
                    {selectedPlans.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="border-border/80 w-52 rounded-xl border p-0" align="start">
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
                        <div className="flex w-full cursor-pointer items-center gap-3 py-1">
                          <Checkbox
                            id={`plan-${plan.value}`}
                            checked={tempPlans.includes(plan.value)}
                            onCheckedChange={() => handlePlanToggle(plan.value)}
                          />
                          <label
                            htmlFor={`plan-${plan.value}`}
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
          <Popover open={rolePopoverOpen} onOpenChange={handleRoleOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 text-xs">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("filters.role")}
                {selectedRoles.length > 0 && (
                  <Badge variant="secondary" className="ms-2 rounded-sm px-1 font-normal lg:hidden">
                    {selectedRoles.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="border-border/80 w-52 rounded-xl border p-0" align="start">
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
                        <div className="flex w-full cursor-pointer items-center gap-3 py-1">
                          <Checkbox
                            id={`role-${role.value}`}
                            checked={tempRoles.includes(role.value)}
                            onCheckedChange={() => handleRoleToggle(role.value)}
                          />
                          <label
                            htmlFor={`role-${role.value}`}
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

        <Button
          variant="outline"
          className="h-9 text-xs"
          onClick={() => setRestoreOpen(true)}>
          <Trash2 className="me-2 h-4 w-4" />
          <span className="hidden md:inline">{t("trash")}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 text-xs md:ms-auto">
              <Columns className="me-2 h-4 w-4" />{" "}
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
                    <TableCell key={cell.id} className="py-4 text-xs">
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

      {/* FOOTER & PAGINASI SHADCN */}
      <div className="flex flex-col items-center justify-between gap-4 pt-4 md:flex-row">
        <div className="text-muted-foreground order-2 text-xs md:order-1">
          {t("footer.selected", {
            selected: table.getFilteredSelectedRowModel().rows.length,
            total: table.getFilteredRowModel().rows.length
          })}
        </div>

        <div className="order-1 flex w-full flex-col items-center justify-end gap-4 sm:flex-row md:order-2 md:w-auto">
          {/* PEMILIH UKURAN HALAMAN (ROW PER PAGE) */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs whitespace-nowrap">Rows per page:</span>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(val) => {
                table.setPageSize(Number(val));
              }}>
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

          {/* KONTROL NAVIGASI PAGINASI SHADCN */}
          {table.getPageCount() > 1 && (
            <Pagination>
              <PaginationContent className="flex-wrap gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    className={`cursor-pointer rounded-lg px-2 py-1 text-xs ${
                      !table.getCanPreviousPage() && "pointer-events-none opacity-50"
                    }`}
                    onClick={() => table.previousPage()}
                  />
                </PaginationItem>

                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext
                    className={`cursor-pointer rounded-lg px-2 py-1 text-xs ${
                      !table.getCanNextPage() && "pointer-events-none opacity-50"
                    }`}
                    onClick={() => table.nextPage()}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {/* Soft-delete user — type-to-confirm */}
      <ConfirmDeleteDialog
        open={!!userToDelete}
        onOpenChange={(o) => !o && setUserToDelete(null)}
        confirmName={userToDelete?.name || ""}
        loading={deleteSaving}
        onConfirm={confirmDeleteUser}
      />

      {/* Ban/suspend user */}
      <Dialog open={!!userToBan} onOpenChange={(o) => !o && setUserToBan(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{tMod("ban.title", { name: userToBan?.name || "" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>{tMod("ban.duration")}</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BAN_DURATIONS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {tMod(d.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{tMod("ban.reason")}</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={2}
                placeholder={tMod("ban.reasonPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToBan(null)} disabled={banSaving}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={confirmBan} disabled={banSaving} variant="destructive">
              {banSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {tMod("ban.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trash — restore user terhapus */}
      <RestoreDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        kind="user"
        onRestored={loadUsersFromSupabase}
      />
    </div>
  );
}
