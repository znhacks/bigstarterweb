import { computeBannedUntil, DEFAULT_BAN_KEY } from "@/config/moderation";
import { supabase } from "@/lib/supabase";
import { profileRepository } from "@/supabase/repositories/profiles";
import { roleRepository } from "@/supabase/repositories/roles";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { banUser, softDeleteUser, unbanUser } from "../actions/account-moderation";
import { ColumnDef } from "@tanstack/react-table";
import {
  actionCol,
  createSelectColumn,
  DataTableColumnHeader,
  dateCol,
  multiSelectFilterFn,
  textCol,
  useDataTable
} from "@/components/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { generateAvatarFallback } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/i18n/format";
import { formatToUserTimezone } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal } from "lucide-react";
import { supabaseAdmin } from "@/lib/api/supabase-server";

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

export function useUsersLogic({ data: initialData }: { data?: User[] }) {
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
      (await roleRepository(supabaseAdmin))
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
      const { data, error } = await (await profileRepository(supabaseAdmin)).query().select(`
          id,
          full_name,
          avatar,
          created_at,
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

  const columns: ColumnDef<User>[] = [
    createSelectColumn<User>(),
    textCol<User>({
      key: "name",
      header: t("headers.name"),
      cell: (row) => {
        const acc = row.accountStatus;
        return (
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={row.image} alt={row.name} />
              <AvatarFallback>{generateAvatarFallback(row.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <div className="text-foreground font-semibold capitalize">{row.name}</div>
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
    }),
    textCol<User>({
      key: "role",
      header: t("headers.role"),
      filterFn: multiSelectFilterFn, // <-- Mengaktifkan filter multi-select
      cell: (row) => <span className="capitalize">{row.role}</span>
    }),
    textCol<User>({
      key: "plan_name",
      header: t("headers.plan"),
      filterFn: multiSelectFilterFn, // <-- Mengaktifkan filter multi-select
      cell: (row) => (
        <Badge variant="outline" className="font-semibold">
          {row.plan_name}
        </Badge>
      )
    }),
    textCol<User>({
      key: "email",
      header: t("headers.email"),
      cell: (row) => <span className="text-muted-foreground text-xs">{row.email}</span>
    }),
    textCol<User>({
      key: "country",
      header: t("headers.country"),
      cell: (row) => row.country
    }),
    textCol<User>({
      key: "status",
      header: t("headers.status"),
      filterFn: multiSelectFilterFn, // <-- Mengaktifkan filter multi-select
      cell: (row) => {
        const status = row.status;
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
      }
    }),
    dateCol<User>({
      key: "lastSignIn",
      header: t("headers.lastSignIn"),
      cell: (row) => {
        const value = row.lastSignIn as string | null;
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
    }),
    dateCol<User>({
      key: "created_at",
      header: t("headers.createdAt"),
      cell: (row) => {
        const value = row.created_at as string;
        if (!value) return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <span className="text-muted-foreground text-xs">
            {formatToUserTimezone(value, timeZone, locale)}
          </span>
        );
      }
    }),
    dateCol<User>({
      key: "updated_at",
      header: t("headers.updatedAt"),
      cell: (row) => {
        const value = row.updated_at as string;
        if (!value) return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <span className="text-muted-foreground text-xs">
            {formatToUserTimezone(value, timeZone, locale)}
          </span>
        );
      }
    }),
    actionCol<User>({
      enableHiding: false,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="cursor-pointer">{t("actions.view")}</DropdownMenuItem>
            {row.accountStatus === "banned" ? (
              <DropdownMenuItem className="cursor-pointer" onClick={() => handleUnban(row.dbId)}>
                {t("actions.unban")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="cursor-pointer" onClick={() => handleBan(row)}>
                {t("actions.ban")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => handleDeleteRow(row)}
              className="text-destructive focus:text-destructive cursor-pointer">
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    })
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

  return {
    isLoading,
    t,
    table,
    statuses,
    plansList,
    roles,
    setRestoreOpen,
    columns,
    userToDelete,
    setUserToDelete,
    ttable,
    deleteSaving,
    confirmDeleteUser,
    userToBan,
    setUserToBan,
    tMod,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    banSaving,
    confirmBan,
    restoreOpen,
    loadUsersFromSupabase
  };
}
