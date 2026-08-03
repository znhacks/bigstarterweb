"use client";

import * as React from "react";
import { ColumnDef, Row } from "@tanstack/react-table";
import {
  Loader2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Languages,
  Coins,
  Lock,
  MoreVertical,
  Ban,
  Unlock
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
  createSelectColumn,
  multiSelectFilterFn,
  textCol,
  dateCol,
  actionCol,
  DataGridBulkActions
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

import { useUsersDataTableLogic, User } from "./logic";
import { formatDateTime, formatRelativeTime } from "@/lib/i18n/format";

export type { User };

// Fungsi pembantu untuk menyensor email
function maskEmail(email: string | null | undefined): string {
  if (!email) return "-";
  const parts = email.split("@");
  if (parts.length !== 2) return email;

  const [localPart, domain] = parts;
  const len = localPart.length;

  if (len <= 2) {
    return `${localPart[0] || ""}*@${domain}`;
  }

  const firstChars = localPart.substring(0, 2);
  const lastChar = localPart.substring(len - 1);
  return `${firstChars}***${lastChar}@${domain}`;
}

// Fungsi pembantu untuk menyensor nomor telepon
function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const cleanPhone = phone.trim();
  const len = cleanPhone.length;

  if (len <= 6) {
    return `${cleanPhone.substring(0, 2)}****`;
  }

  const firstChars = cleanPhone.substring(0, 4);
  const lastChars = cleanPhone.substring(len - 3);
  return `${firstChars}****${lastChars}`;
}

export default function UsersDataTable({ data: initialData }: { data?: User[] }) {
  const t = useTranslations("superadmin.users");
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

  const [activeUserDetail, setActiveUserDetail] = React.useState<User | null>(null);
  const selectColumn = React.useMemo(() => {
    const baseCol = createSelectColumn<User>();
    return {
      ...baseCol,
      cell: (props: any) => {
        const originalCell = baseCol.cell;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {typeof originalCell === "function" ? originalCell(props) : null}
          </div>
        );
      }
    };
  }, []);

  const columns = React.useMemo<ColumnDef<User, unknown>[]>(
    () => [
      selectColumn,
      textCol<User>({
        key: "name",
        header: t("headers.name"),
        cell: (row) => {
          const acc = row.accountStatus;
          return (
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={row.image} alt={row.name} />
                <AvatarFallback>{generateAvatarFallback(row.name || "U")}</AvatarFallback>
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
        cell: (row) => {
          const role = row.role as string;
          return (
            <Badge variant={role === "superadmin" ? "warning" : "secondary"}>
              {t(`roles.${role}`)}
            </Badge>
          );
        },
        filterFn: multiSelectFilterFn
      }),
      textCol<User>({
        key: "country",
        header: t("headers.country"),
        cell: (row) => row.country
      }),
      textCol<User>({
        key: "status",
        header: t("headers.status"),
        cell: (row) => {
          const status = row.status;
          const statusMap = {
            active: "success",
            banned: "destructive",
            deleted: "outline"
          } as const;
          const statusClass = statusMap[status] ?? "outline";
          return <Badge variant={statusClass}>{t(`accountStatus.${status}`)}</Badge>;
        },
        filterFn: multiSelectFilterFn
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
              {formatRelativeTime(value, locale)}
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
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setActiveUserDetail(row)}>
                {t("actions.view")}
              </DropdownMenuItem>
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
    ],
    [locale, timeZone, t, handleUnban, handleBan, handleDeleteRow]
  );

  const table = useDataGrid({ columns, data: users });

  const statuses = [
    { value: "active", label: "Active" },
    { value: "banned", label: "Banned" },
    { value: "deleted", label: "Deleted" }
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
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
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
            columnId="role"
            title={t("filters.role")}
            options={roles}
            emptyText={t("filters.noRole")}
          />

          <Button variant="outline" className="h-9 text-xs" onClick={() => setRestoreOpen(true)}>
            <Trash2 className="me-2 h-4 w-4" />
            <span className="hidden md:inline">{t("trash")}</span>
          </Button>

          <DataGridBulkActions
            label={t("actions.bulkActions")}

            actions={[
              {
                label: t("actions.ban"),
                icon: Ban,
                tone: "warning",
                disabled: (rows: unknown[]) => {
                  const items = rows as any[];
                  return (
                    items.length === 0 ||
                    items.every((r) => {
                      const status = r?.original?.status ?? r?.status;
                      return status === "banned";
                    })
                  );
                },
                onSelect: (selectedRows: unknown[]) => {
                  const items = selectedRows as any[];
                  const selectedUsers = items.map((r) => r?.original ?? r);
                  if (selectedUsers.length > 0) {
                    handleBan(selectedUsers[0]);
                  }
                }
              },
              {
                label: t("actions.unban"),
                icon: Unlock,
                tone: "warning",
                disabled: (rows: unknown[]) => {
                  const items = rows as any[];
                  return (
                    items.length === 0 ||
                    items.every((r) => {
                      const status = r?.original?.status ?? r?.status;
                      return status !== "banned";
                    })
                  );
                },
                onSelect: (selectedRows: unknown[]) => {
                  const items = selectedRows as any[];
                  const selectedUsers = items.map((r) => r?.original ?? r);
                  if (selectedUsers.length > 0) {
                    handleUnban(selectedUsers[0].dbId);
                  }
                }
              },
              {
                label: t("actions.delete"),
                icon: Trash2,
                tone: "destructive",
                separator: true,
                disabled: (rows: unknown[]) => (rows as any[]).length === 0,
                onSelect: (selectedRows: unknown[]) => {
                  const items = selectedRows as any[];
                  const selectedUsers = items.map((r) => r?.original ?? r);
                  if (selectedUsers.length > 0) {
                    handleDeleteRow(selectedUsers[0]);
                  }
                }
              }
            ]}
          />

          <DataGridViewOptions label={t("filters.columns")} className="md:ms-auto" />
        </DataGridToolbar>
        <DataGridContent>
          <DataGridTable onRowClick={(row) => setActiveUserDetail(row.original)} className="" />
          <DataGridPagination
            selectedLabel={(selected, total) => t("footer.selected", { selected, total })}
            previousLabel={ttable("pagination.previous")}
            nextLabel={ttable("pagination.next")}
          />
        </DataGridContent>
      </DataGrid>

      <Sheet open={!!activeUserDetail} onOpenChange={(open) => !open && setActiveUserDetail(null)}>
        <SheetContent
          side={locale === "ar" ? "left" : "right"}
          className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg md:max-w-xl">
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
                  <Mail className="inline h-3 w-3" /> {maskEmail(activeUserDetail?.email)}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {activeUserDetail && (
            <div className="flex-1 space-y-6 overflow-y-auto p-6 text-start text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge
                  className="capitalize"
                  variant={activeUserDetail.is_superadmin ? "warning" : "secondary"}>
                  {t("headers.role")}: {t(`roles.${activeUserDetail.role}`)}
                </Badge>
                <Badge variant={activeUserDetail.status === "active" ? "success" : "destructive"}>
                  {t(`accountStatus.${activeUserDetail.status}`)}
                </Badge>
                {activeUserDetail.is_superadmin && (
                  <Badge variant="warning">{t("roles.superadmin")}</Badge>
                )}
              </div>

              {activeUserDetail.description && (
                <div className="space-y-1.5">
                  <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    {t("detail.description")}
                  </h4>
                  <p className="text-foreground bg-muted/40 rounded-lg border p-3 text-sm leading-relaxed">
                    {activeUserDetail.description}
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {t("detail.contacts")}
                </h4>
                <div className="flex items-center gap-3">
                  <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">{t("detail.phone")}</p>
                    <p className="font-medium">{maskPhone(activeUserDetail.phone)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {t("detail.address.useraddress")}
                </h4>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-start gap-1.5 sm:col-span-2">
                    <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {t("detail.address.mainAddress")}
                      </p>
                      <p className="font-medium">
                        {activeUserDetail.address_line1 || "-"}
                        {activeUserDetail.address_line2 && `, ${activeUserDetail.address_line2}`}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t("detail.address.village")}</p>
                    <p className="font-medium">{activeUserDetail.address_desa || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {t("detail.address.subdistrict")}
                    </p>
                    <p className="font-medium">{activeUserDetail.address_kecamatan || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t("detail.address.city")}</p>
                    <p className="font-medium">{activeUserDetail.address_city || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t("detail.address.province")}</p>
                    <p className="font-medium">{activeUserDetail.address_region || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      {t("detail.address.postalCode")}
                    </p>
                    <p className="font-medium">{activeUserDetail.address_postal_code || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t("detail.address.country")}</p>
                    <p className="font-medium uppercase">
                      {activeUserDetail.address_country || activeUserDetail.country || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {t("detail.preference.title")}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Languages className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {t("detail.preference.selectedLanguage")}
                      </p>
                      <p className="font-medium uppercase">
                        {activeUserDetail.preferred_language || "en"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {t("detail.preference.currency")}
                      </p>
                      <p className="font-mono font-medium uppercase">
                        {activeUserDetail.currency || "IDR"}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Clock className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {t("detail.preference.timezone")}
                      </p>
                      <p className="font-medium">{activeUserDetail.timezone || "UTC"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {activeUserDetail.accountStatus === "banned" && (
                <>
                  <Separator />
                  <div className="border-destructive/20 bg-destructive/5 space-y-3 rounded-xl border p-4">
                    <div className="text-destructive flex items-center gap-2 font-semibold">
                      <Lock className="h-4 w-4" />
                      <h4>{t("detail.banned.title")}</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground font-sans font-semibold">
                          {t("detail.banned.reason")}
                        </p>
                        <p className="text-foreground">
                          {activeUserDetail.bannedReason || "Tidak dicantumkan."}
                        </p>
                      </div>
                      {activeUserDetail.bannedUntil && (
                        <div>
                          <p className="text-muted-foreground font-semibold">
                            {t("detail.banned.bannedUntil")}
                          </p>
                          <p className="text-foreground">
                            {formatDateTime(activeUserDetail.bannedUntil, locale)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="bg-muted text-muted-foreground space-y-2 rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    {t("detail.registeredAt")}{" "}
                    {activeUserDetail.created_at
                      ? formatRelativeTime(activeUserDetail.created_at, locale)
                      : "-"}
                  </span>
                </div>
                {activeUserDetail.lastSignIn && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      {t("detail.lastLogin")}{" "}
                      {formatRelativeTime(activeUserDetail.lastSignIn, locale)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <SheetFooter className="border-border bg-muted/20 flex items-end justify-end gap-3 border-t p-6 sm:justify-end">
            <Button variant="outline" onClick={() => setActiveUserDetail(null)}>
              {t("detail.back")}
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
