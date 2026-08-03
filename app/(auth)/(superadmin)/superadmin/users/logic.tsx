import { useState, useEffect } from "react";
import { useLocale } from "next-intl";

import {
  softDeleteUser,
  banUser,
  unbanUser
} from "@/app/(auth)/(superadmin)/superadmin/actions/account-moderation";
import { getSuperadminUsers } from "./actions";
import { DEFAULT_BAN_KEY, computeBannedUntil } from "@/config/moderation";

export type User = {
  id: number;
  dbId: string;
  name: string;
  email: string | null;
  role: "superadmin" | "user";
  image: string;
  country: string;
  status: "active" | "banned" | "deleted";
  lastSignIn?: string | null;
  created_at?: string;
  updated_at?: string;
  accountStatus?: "active" | "banned" | "deleted";
  bannedUntil?: string | null;
  bannedReason?: string | null;

  description?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_desa?: string | null;
  address_kecamatan?: string | null;
  address_city?: string | null;
  address_region?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
  preferred_language?: string | null;
  currency?: string | null;
  timezone?: string | null;
  is_superadmin: boolean;
};

export function useUsersDataTableLogic(initialData?: User[]) {
  const locale = useLocale();

  const [users, setUsers] = useState<User[]>(initialData || []);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [timeZone, setTimeZone] = useState("UTC");

  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [banDuration, setBanDuration] = useState<string>(DEFAULT_BAN_KEY);
  const [banReason, setBanReason] = useState<string>("");
  const [banSaving, setBanSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

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
    if (initialData) {
      setUsers(initialData);
    } else {
      loadUsersFromSupabase();
    }
  }, [initialData]);

  useEffect(() => {
    setRoles([
      { value: "superadmin", label: "Superadmin" },
      { value: "user", label: "User" }
    ]);
  }, []);

  const loadUsersFromSupabase = async () => {
    setIsLoading(true);
    try {
      const data = await getSuperadminUsers();
      setUsers(data);
    } catch (e) {
      console.error("Gagal memuat pengguna dari Supabase:", e);
    } finally {
      setIsLoading(false);
    }
  };

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
              status: "banned",
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
          ? {
              ...u,
              status: "active",
              accountStatus: "active",
              bannedUntil: null,
              bannedReason: null
            }
          : u
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
