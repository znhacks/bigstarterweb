"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import {
  deleteNotificationAction,
  getInboxAction,
  getUnreadCountAction,
  markAllReadAction,
  markReadAction,
  type InboxItem
} from "@/app/(auth)/(users)/notifications/action";

export interface UseNotifications {
  items: InboxItem[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * Hook inbox notifikasi: fetch awal via server action + subscribe Supabase
 * Realtime (public.notifications) untuk update live.
 *
 * Catatan RLS: TANPA filter user_id — Supabase Realtime menerapkan RLS pada
 * subscription browser, sehingga user HANYA menerima perubahan baris miliknya.
 * Ini lebih aman daripada filter sisi-client.
 *
 * Channel dibuat sinkron (`.on()` sebelum `.subscribe()`) dengan nama unik per
 * instance (reactId) supaya tidak terjadi dedupe "after subscribe()" saat hook
 * dipakai bersamaan (mis. bell + inbox) atau saat StrictMode double-invoke.
 */
export function useNotifications(limit = 50): UseNotifications {
  const [items, setItems] = React.useState<InboxItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        getInboxAction({ limit }),
        getUnreadCountAction()
      ]);
      setItems(list);
      setUnread(count);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const channelName = `notifications-${React.useId().replace(/:/g, "")}`;

  React.useEffect(() => {
    refresh();

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, channelName]);

  const markRead = React.useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_read: true } : i))
    );
    setUnread((u) => Math.max(0, u - 1));
    await markReadAction(id);
  }, []);

  const markAllRead = React.useCallback(async () => {
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    setUnread(0);
    await markAllReadAction();
  }, []);

  const remove = React.useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await deleteNotificationAction(id);
  }, []);

  return { items, unread, loading, refresh, markRead, markAllRead, remove };
}
