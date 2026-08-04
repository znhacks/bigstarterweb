"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  BellOff,
  CheckCheck,
  Search,
  Settings,
  ChevronDown,
  SlidersHorizontal
} from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { notificationIcon, resolveNotificationHref } from "@/lib/notifications/meta";

// Komponen Logo Boilerplate/Sistem dengan desain modern
const BoilerplateLogo = () => (
  <div className="from-primary flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br via-indigo-500 to-violet-600 p-[1.5px] shadow-sm">
    <div className="bg-background flex size-full items-center justify-center rounded-full">
      <svg
        className="text-primary size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
  </div>
);

export function InboxView() {
  const t = useTranslations("notifications");
  const tRoot = useTranslations();
  const { items, unread, loading, markRead, markAllRead } = useNotifications(50);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Filter berdasarkan status baca dan kata kunci pencarian
  const shown = items
    .filter((item) => (filter === "unread" ? !item.is_read : true))
    .filter((item) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(query) || item.body?.toLowerCase().includes(query);
    });

  const categoryLabel = (id: string) => {
    try {
      return tRoot(`notifications.category.${id}`);
    } catch {
      return id;
    }
  };

  // Helper untuk memformat waktu secara ringkas ala GitHub
  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return `${Math.floor(diffMins / 1440)}d ago`;
    } catch {
      return "";
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      {/* Header Utama */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              {t("inbox.title")}
            </h1>
            {unread > 0 && (
              <Badge
                variant="secondary"
                className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 font-semibold text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
                {unread} {t("inbox.filterUnread")}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Stay up to date with what's happening across your projects.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={markAllRead}
            disabled={unread === 0}
            className="h-9 shadow-sm">
            <CheckCheck className="mr-1.5 size-4" />
            {t("inbox.markAllRead")}
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Settings className="text-muted-foreground size-4" />
          </Button>
        </div>
      </div>

      {/* Filter dan Pencarian Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border py-1.5 pr-4 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
            Status
            <ChevronDown className="text-muted-foreground size-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
            Type
            <ChevronDown className="text-muted-foreground size-3.5" />
          </Button>

          <div className="bg-muted inline-flex h-9 items-center rounded-md p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded px-3 py-1 font-medium transition-all",
                filter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}>
              {t("inbox.filterAll")}
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "rounded px-3 py-1 font-medium transition-all",
                filter === "unread"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}>
              {t("inbox.filterUnread")}
            </button>
          </div>
        </div>
      </div>

      {/* Daftar Notifikasi dalam Satu Container Terpadu */}
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        {loading ? (
          <div className="text-muted-foreground py-16 text-center text-sm">{t("inbox.empty")}</div>
        ) : shown.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="bg-muted rounded-full p-3">
              <BellOff className="text-muted-foreground size-6" />
            </div>
            <p className="text-sm font-medium">{t("inbox.empty")}</p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {shown.map((item) => {
              const Icon = notificationIcon(item.category);
              const href = resolveNotificationHref(item);

              // Cek pengirim (asumsi relasi pengirim berada di field 'item.sender' atau 'item.actor')
              const sender = (item as any).sender || (item as any).actor || null;

              // Kriteria Sistem/Superadmin:
              // 1. Tidak ada pengirim yang tercatat (notifikasi otomatis sistem)
              // 2. Memiliki role superadmin atau system
              const isSystem = !sender || sender.role === "system" || sender.role === "superadmin";

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group hover:bg-muted/30 relative flex flex-col gap-4 p-4 transition-colors md:flex-row md:items-start",
                    !item.is_read && "bg-primary/[0.02]"
                  )}>
                  {/* Bagian Kiri: Avatar Pengirim atau Logo Sistem */}
                  <div className="flex shrink-0 items-start gap-3">
                    {/* Indikator unread di sebelah kiri baris */}
                    <div className="flex h-10 items-center">
                      <div
                        className={cn(
                          "size-2 rounded-full transition-all",
                          !item.is_read ? "bg-primary scale-100" : "scale-0 bg-transparent"
                        )}
                      />
                    </div>

                    {isSystem ? (
                      <BoilerplateLogo />
                    ) : (
                      <div className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border shadow-sm">
                        {sender?.avatar ? (
                          <img
                            src={sender.avatar}
                            alt={sender.name || "User Avatar"}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs font-semibold uppercase">
                            {sender?.name?.slice(0, 2) || "U"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bagian Tengah: Judul & Deskripsi Notifikasi */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-col gap-1">
                      {/* Judul Utama */}
                      <Link
                        href={href}
                        onClick={() => {
                          if (!item.is_read) markRead(item.id);
                        }}
                        className="text-foreground block cursor-pointer text-sm font-semibold hover:underline">
                        {isSystem ? item.title : sender?.name || item.title}
                      </Link>

                      {/* Jika bukan notifikasi sistem, tampilkan subjudul/title notifikasinya di sini */}
                      {!isSystem && (
                        <span className="text-muted-foreground text-xs font-medium">
                          {item.title}
                        </span>
                      )}
                    </div>

                    {/* Body/Isi Pesan */}
                    {item.body && (
                      <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed">
                        {item.body}
                      </p>
                    )}

                    {/* Tombol Aksi Opsional (Contoh: Request Akses) */}
                    {item.category === "team" && item.body?.toLowerCase().includes("request") && (
                      <div className="flex items-center gap-2 pt-1.5">
                        <Button
                          size="sm"
                          className="h-7 bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500"
                          onClick={(e) => {
                            e.preventDefault();
                            // Handle Accept Action
                          }}>
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-3 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            // Handle Decline Action
                          }}>
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Bagian Kanan: Metadata (Kategori & Waktu) */}
                  <div className="flex min-w-[120px] shrink-0 items-center justify-between gap-2 pt-1 md:flex-col md:items-end md:justify-between md:self-stretch md:pt-0">
                    {/* Badge Kategori dengan dot berwarna sesuai jenis */}
                    <span className="bg-muted text-muted-foreground border-border/50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          item.category === "ticket"
                            ? "bg-blue-500"
                            : item.category === "team"
                              ? "bg-purple-500"
                              : item.category === "message"
                                ? "bg-green-500"
                                : "bg-zinc-400"
                        )}
                      />
                      {categoryLabel(item.category)}
                    </span>

                    {/* Waktu relatif */}
                    <span
                      className="text-muted-foreground text-[11px]"
                      title={new Date(item.created_at).toLocaleString()}>
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
