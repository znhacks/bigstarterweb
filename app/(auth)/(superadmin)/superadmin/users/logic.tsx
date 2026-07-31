// app/(auth)/(superadmin)/superadmin/users/logic.ts
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { roleRepository } from "@/supabase/repositories/roles";
import { profileRepository } from "@/supabase/repositories/profiles";
import { useLocale } from "next-intl";

import {
  softDeleteUser,
  banUser,
  unbanUser
} from "@/app/(auth)/(superadmin)/superadmin/actions/account-moderation";
import { DEFAULT_BAN_KEY, computeBannedUntil } from "@/config/moderation";

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

export const getLocalizedValue = (value: any, locale: string): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value[locale] || value["en"] || Object.values(value)[0] || "";
  }
  return String(value);
};

export function useUsersDataTableLogic(initialData?: User[]) {
  const locale = useLocale();

  const [users, setUsers] = useState<User[]>(initialData || []);
  const [rawProfiles, setRawProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [timeZone, setTimeZone] = useState("UTC");

  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [planNameMap, setPlanNameMap] = useState<Map<string, any>>(new Map());

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [banDuration, setBanDuration] = useState<string>(DEFAULT_BAN_KEY);
  const [banReason, setBanReason] = useState<string>("");
  const [banSaving, setBanSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

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
    if (rawProfiles.length === 0 && initialData) return;

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

  return {
    users,
    roles,
    isLoading,
    locale,
    timeZone,
    userToDelete,
    setUserToDelete,
    userToBan,
    setUserToBan,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    banSaving,
    deleteSaving,
    restoreOpen,
    setRestoreOpen,
    handleDeleteRow,
    confirmDeleteUser,
    handleBan,
    confirmBan,
    handleUnban,
    loadUsersFromSupabase
  };
}
