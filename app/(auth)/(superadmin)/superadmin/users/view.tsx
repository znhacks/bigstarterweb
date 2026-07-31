// app/(auth)/(superadmin)/superadmin/users/view.tsx
"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Loader2,
  Trash2,
  User as UserIcon,
  Shield,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Clock,
  Languages,
  Coins,
  Lock,
  MoreVertical
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useDataGrid,
  DataGrid,
  DataGridToolbar,
  DataGridContent,
  DataGridSearch,
  DataGridFacetedFilter,
  DataGridViewOptions,
  DataGridTable,
  DataGridPagination,
  DataGridColumnHeader,
  createSelectColumn,
  multiSelectFilterFn
} from "@/components/data-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { generateAvatarFallback } from "@/lib/utils";

import { formatToUserTimezone, formatRelativeTime } from "@/lib/date";
import { BAN_DURATIONS } from "@/config/moderation";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { RestoreDialog } from "@/components/restore-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Import logic hook dan tipe data
import { useUsersDataTableLogic, User } from "./logic";

export type { User };

export default function UsersDataTable({ data: initialData }: { data?: User[] }) {
  const ttitle = useTranslations("superadmin.users");
  const t = useTranslations("superadmin.users.data-table");
  const tMod = useTranslations("moderation");
  const ttable = useTranslations("data-table");

  const {
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
  } = useUsersDataTableLogic(initialData);

  // State kustom untuk menyimpan detail data pengguna aktif di Slide-Over
  const [activeUserDetail, setActiveUserDetail] = React.useState<User | null>(null);

  const columns = React.useMemo<ColumnDef<User, unknown>[]>(
    () => [
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
                <AvatarFallback>
                  {generateAvatarFallback(row.getValue("name") || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <div className="text-foreground font-semibold capitalize">
                  {row.getValue("name")}
                </div>
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
        header: ({ column }) => <DataGridColumnHeader column={column} title={t("headers.role")} />,
        cell: ({ row }) => <span className="capitalize">{row.getValue("role")}</span>,
        filterFn: multiSelectFilterFn
      },
      {
        accessorKey: "plan_name",
        meta: {
          label: t("headers.plan")
        },
        header: ({ column }) => <DataGridColumnHeader column={column} title={t("headers.plan")} />,
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
        header: ({ column }) => <DataGridColumnHeader column={column} title={t("headers.email")} />,
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
          <DataGridColumnHeader column={column} title={t("headers.country")} />
        ),
        cell: ({ row }) => row.getValue("country")
      },
      {
        accessorKey: "status",
        meta: {
          label: t("headers.status")
        },
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("headers.status")} />
        ),
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
          <DataGridColumnHeader column={column} title={t("headers.lastSignIn")} />
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
          <DataGridColumnHeader column={column} title={t("headers.createdAt")} />
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
          <DataGridColumnHeader column={column} title={t("headers.updatedAt")} />
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
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setActiveUserDetail(row.original)}>
                {t("actions.view")}
              </DropdownMenuItem>
              {row.original.accountStatus === "banned" ? (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleUnban(row.original.dbId)}>
                  {t("actions.unban")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => handleBan(row.original)}>
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
    ],
    [locale, timeZone, t, handleUnban, handleBan, handleDeleteRow]
  );

  const table = useDataGrid({ columns, data: users });

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
    <div className="w-full space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{ttitle("title")}</h1>
      <DataGrid table={table} columns={columns} noResultsText={t("footer.noResults")}>
        <DataGridToolbar>
          <DataGridSearch columnId="name" placeholder={t("filters.search")} />

          <DataGridFacetedFilter
            columnId="status"
            title={t("filters.status")}
            options={statuses}
            emptyText={t("filters.noStatus")}
          />

          <DataGridFacetedFilter
            columnId="plan_name"
            title={t("filters.plan")}
            options={plansList}
            emptyText={t("filters.noPlan")}
          />

          <DataGridFacetedFilter
            columnId="role"
            title={t("filters.role")}
            options={roles}
            emptyText={t("filters.noRole")}
          />

          <Button variant="outline" className="h-9 text-xs" onClick={() => setRestoreOpen(true)}>
            <Trash2 className="me-2 h-4 w-4" />
            <span className="hidden md:inline">{t("trash")}</span>
          </Button>

          <DataGridViewOptions label={t("filters.columns")} className="md:ms-auto" />
        </DataGridToolbar>
        <DataGridContent>
          {/* Mendukung klik pada baris data untuk membuka detail user */}
          <DataGridTable onRowClick={(row) => setActiveUserDetail(row.original)} className="" />
          <DataGridPagination
            selectedLabel={(selected, total) => t("footer.selected", { selected, total })}
            previousLabel={ttable("pagination.previous")}
            nextLabel={ttable("pagination.next")}
          />
        </DataGridContent>
      </DataGrid>

      {/* Slide-over Detail Pengguna (Sheet) */}
      <Sheet open={!!activeUserDetail} onOpenChange={(open) => !open && setActiveUserDetail(null)}>
        <SheetContent
          side={locale === "ar" ? "left" : "right"}
          className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg md:max-w-xl">
          {/* Header Profil */}
          <SheetHeader className="border-border border-b p-6 text-start">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border">
                <AvatarImage src={activeUserDetail?.image} alt={activeUserDetail?.name} />
                <AvatarFallback className="text-lg">
                  {generateAvatarFallback(activeUserDetail?.name || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <SheetTitle className="text-xl font-bold">{activeUserDetail?.name}</SheetTitle>
                <SheetDescription className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Mail className="inline h-3 w-3" /> {activeUserDetail?.email || "-"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Konten Utama Detail Profil */}
          {activeUserDetail && (
            <div className="flex-1 space-y-6 overflow-y-auto p-6 text-start text-sm">
              {/* Badge Moderasi & Atribut Peran */}
              <div className="flex flex-wrap gap-2">
                <Badge className="capitalize" variant="outline">
                  Plan: {activeUserDetail.plan_name || "Free"}
                </Badge>
                <Badge className="capitalize">Role: {activeUserDetail.role || "User"}</Badge>
                <Badge
                  variant={activeUserDetail.status === "active" ? "success" : "destructive"}
                  className="capitalize">
                  {activeUserDetail.status}
                </Badge>
                {activeUserDetail.accountStatus === "banned" && (
                  <Badge variant="destructive" className="capitalize">
                    Banned
                  </Badge>
                )}
                {(activeUserDetail as any).is_superadmin && (
                  <Badge variant="warning">Superadmin</Badge>
                )}
              </div>

              {/* Deskripsi / Biografi */}
              {(activeUserDetail as any).description && (
                <div className="space-y-1.5">
                  <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Deskripsi / Bio
                  </h4>
                  <p className="text-foreground bg-muted/40 rounded-lg border p-3 text-sm leading-relaxed">
                    {(activeUserDetail as any).description}
                  </p>
                </div>
              )}

              <Separator />

              {/* Kontak Tambahan */}
              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Informasi Kontak
                </h4>
                <div className="flex items-center gap-3">
                  <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Nomor Telepon</p>
                    <p className="font-medium">{(activeUserDetail as any).phone || "-"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detail Alamat (profiles schema) */}
              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Alamat Pengguna
                </h4>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-start gap-1.5 sm:col-span-2">
                    <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">Alamat Utama</p>
                      <p className="font-medium">
                        {(activeUserDetail as any).address_line1 || "-"}
                        {(activeUserDetail as any).address_line2 &&
                          `, ${(activeUserDetail as any).address_line2}`}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Desa / Kelurahan</p>
                    <p className="font-medium">{(activeUserDetail as any).address_desa || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Kecamatan</p>
                    <p className="font-medium">
                      {(activeUserDetail as any).address_kecamatan || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Kota / Kabupaten</p>
                    <p className="font-medium">{(activeUserDetail as any).address_city || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Provinsi / Wilayah</p>
                    <p className="font-medium">{(activeUserDetail as any).address_region || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Kode Pos</p>
                    <p className="font-medium">
                      {(activeUserDetail as any).address_postal_code || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Negara</p>
                    <p className="font-medium uppercase">
                      {(activeUserDetail as any).address_country || activeUserDetail.country || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Konfigurasi Bahasa, Mata Uang, & Zona Waktu */}
              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Preferensi & Sistem
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Languages className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="text-muted-foreground text-xs">Bahasa Pilihan</p>
                      <p className="font-medium uppercase">
                        {(activeUserDetail as any).preferred_language || "en"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="text-muted-foreground text-xs">Mata Uang</p>
                      <p className="font-medium uppercase">
                        {(activeUserDetail as any).currency || "IDR"}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Clock className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="text-muted-foreground text-xs">Zona Waktu</p>
                      <p className="font-medium">{(activeUserDetail as any).timezone || "UTC"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Moderasi Ban */}
              {activeUserDetail.accountStatus === "banned" && (
                <>
                  <Separator />
                  <div className="border-destructive/20 bg-destructive/5 space-y-3 rounded-xl border p-4">
                    <div className="text-destructive flex items-center gap-2 font-semibold">
                      <Lock className="h-4 w-4" />
                      <h4>Detail Pemblokiran Akun</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold">Alasan Pemblokiran:</p>
                        <p className="text-foreground">
                          {(activeUserDetail as any).banned_reason || "Tidak dicantumkan."}
                        </p>
                      </div>
                      {(activeUserDetail as any).banned_until && (
                        <div>
                          <p className="text-muted-foreground font-semibold">Diblokir Hingga:</p>
                          <p className="text-foreground">
                            {formatToUserTimezone(
                              (activeUserDetail as any).banned_until,
                              timeZone,
                              locale
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Metadata Login & Waktu Pembuatan */}
              <div className="bg-muted text-muted-foreground space-y-2 rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    Daftar akun:{" "}
                    {formatToUserTimezone(activeUserDetail.created_at, timeZone, locale)}
                  </span>
                </div>
                {activeUserDetail.lastSignIn && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      Masuk terakhir:{" "}
                      {formatToUserTimezone(activeUserDetail.lastSignIn, timeZone, locale)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Slide-Over */}
          <SheetFooter className="border-border bg-muted/20 flex items-center justify-end gap-3 border-t p-6 sm:justify-end">
            <Button variant="outline" onClick={() => setActiveUserDetail(null)}>
              Kembali
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
