"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Loader2, Trash2 } from "lucide-react";

import { useDataTable } from "@/components/data-table/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { createSelectColumn } from "@/components/data-table/data-table-select-column";
import { multiSelectFilterFn } from "@/components/data-table/data-table-filters";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { generateAvatarFallback } from "@/lib/utils";

import { formatToUserTimezone, formatRelativeTime } from "@/lib/date";
import { supabase } from "@/lib/supabase";
import { roleRepository } from "@/supabase/repositories/roles";
import { profileRepository } from "@/supabase/repositories/profiles";
import { useTranslations, useLocale } from "next-intl";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
  accountStatus?: "active" | "banned" | "deleted";
  bannedUntil?: string | null;
  bannedReason?: string | null;
};

const getLocalizedValue = (value: any, locale: string): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value[locale] || value["en"] || Object.values(value)[0] || "";
  }
  return String(value);
};

export default function UsersDataTable({ data: initialData }: { data?: User[] }) {
  const t = useTranslations("superadmin.users.data-table");
  const tMod = useTranslations("moderation");
  const ttable = useTranslations("data-table");
  const locale = useLocale();

  const [users, setUsers] = useState<User[]>(initialData || []);
  const [rawProfiles, setRawProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [timeZone, setTimeZone] = useState("UTC");

  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [planNameMap, setPlanNameMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((res) => {
        const map = new Map<string, any>();
        (res?.plans || []).forEach((p: any) => map.set(p.id, p.name));
        setPlanNameMap(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const resolvedZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (resolvedZone) setTimeZone(resolvedZone);
      } catch (e) {
        console.warn("Gagal mendapatkan zona waktu sistem, menggunakan UTC sebagai fallback.", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!initialData) loadUsersFromSupabase();
  }, [initialData]);

  useEffect(() => {
    (async () => {
      (await roleRepository(supabase))
        .query()
        .select("name")
        .order("hierarchy_level", { ascending: false })
        .then(({ data }) => {
          if (data) {
            setRoles(
              data.map((r: any) => {
                const localizedRole = getLocalizedValue(r.name, locale);
                return { value: localizedRole, label: localizedRole };
              })
            );
          }
        });
    })();
  }, [locale]);

  const loadUsersFromSupabase = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (await profileRepository(supabase)).query().select(`
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
      setRawProfiles(data || []);
    } catch (e) {
      console.error("Gagal memuat pengguna dari Supabase:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialData) return;

    const formatted: User[] = rawProfiles.map((prof: any, index: number) => {
      const fullName = prof.full_name || "Unknown User";
      const firstMembership = prof.memberships?.[0];
      const tenant = firstMembership?.tenants;
      const firstSub = tenant?.subscriptions?.[0];

      const rawPlanName = planNameMap.get(firstSub?.plan_id);
      const planName = rawPlanName ? getLocalizedValue(rawPlanName, locale) : "Free";
      const roleVal = getLocalizedValue(firstMembership?.roles?.name, locale) || "Member";
      const statusVal = firstSub?.status === "active" ? "active" : "inactive";

      return {
        id: index + 1,
        dbId: prof.id,
        firstName: fullName.split(" ")[0] || "",
        lastName: fullName.split(" ").slice(1).join(" ") || "",
        name: fullName,
        role: roleVal,
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
  }, [rawProfiles, planNameMap, locale, initialData]);

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
    setRawProfiles((prev) => prev.filter((u) => u.id !== userToDelete.dbId));
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
    setRawProfiles((prev) =>
      prev.map((u) =>
        u.id === userToBan.dbId
          ? {
              ...u,
              status: "banned",
              banned_until: until,
              banned_reason: banReason.trim() || null
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
    setRawProfiles((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: "active", banned_until: null, banned_reason: null } : u
      )
    );
  };

  const columns: ColumnDef<User, unknown>[] = [
    createSelectColumn<User>(),
    {
      accessorKey: "name",
      header: t("headers.name"),
      meta: {
        label: t("headers.name")
      },
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
      meta: {
        label: t("headers.role")
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("headers.role")} />,
      cell: ({ row }) => <span className="capitalize">{row.getValue("role")}</span>,
      filterFn: multiSelectFilterFn
    },
    {
      accessorKey: "plan_name",
      meta: {
        label: t("headers.plan")
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("headers.plan")} />,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-semibold">
          {row.getValue("plan_name")}
        </Badge>
      ),
      filterFn: multiSelectFilterFn
    },
    {
      accessorKey: "email",
      meta: {
        label: t("headers.email")
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("headers.email")} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.getValue("email")}</span>
      )
    },
    {
      accessorKey: "country",
      meta: {
        label: t("headers.country")
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("headers.country")} />
      ),
      cell: ({ row }) => row.getValue("country")
    },
    {
      accessorKey: "status",
      meta: {
        label: t("headers.status")
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("headers.status")} />,
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
      meta: {
        label: t("headers.lastSignIn")
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("headers.lastSignIn")} />
      ),
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
      meta: {
        label: t("headers.createdAt")
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("headers.createdAt")} />
      ),
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
      meta: {
        label: t("headers.updatedAt")
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("headers.updatedAt")} />
      ),
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
      cell: ({ row }) => (
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
                onClick={() => handleUnban(row.original.dbId)}>
                {t("actions.unban")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="cursor-pointer" onClick={() => handleBan(row.original)}>
                {t("actions.ban")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => handleDeleteRow(row.original)}
              className="text-destructive focus:text-destructive cursor-pointer">
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  const table = useDataTable({ columns, data: users });

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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-row flex-wrap items-center gap-2 py-4">
        <DataTableSearch table={table} columnId="name" placeholder={t("filters.search")} />

        <DataTableFacetedFilter
          column={table.getColumn("status")}
          title={t("filters.status")}
          options={statuses}
          emptyText={t("filters.noStatus")}
        />

        <DataTableFacetedFilter
          column={table.getColumn("plan_name")}
          title={t("filters.plan")}
          options={plansList}
          emptyText={t("filters.noPlan")}
        />

        <DataTableFacetedFilter
          column={table.getColumn("role")}
          title={t("filters.role")}
          options={roles}
          emptyText={t("filters.noRole")}
        />

        <Button variant="outline" className="h-9 text-xs" onClick={() => setRestoreOpen(true)}>
          <Trash2 className="me-2 h-4 w-4" />
          <span className="hidden md:inline">{t("trash")}</span>
        </Button>

        <DataTableViewOptions table={table} label={t("filters.columns")} className="md:ms-auto" />
      </div>

      <DataTable table={table} columns={columns} noResultsText={t("footer.noResults")} />

      <DataTablePagination
        table={table}
        selectedLabel={(selected, total) => t("footer.selected", { selected, total })}
        previousLabel={ttable("pagination.previous")}
        nextLabel={ttable("pagination.next")}
      />

      <ConfirmDeleteDialog
        open={!!userToDelete}
        onOpenChange={(o) => !o && setUserToDelete(null)}
        confirmName={userToDelete?.name || ""}
        loading={deleteSaving}
        onConfirm={confirmDeleteUser}
      />

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

      <RestoreDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        kind="user"
        onRestored={loadUsersFromSupabase}
      />
    </div>
  );
}
