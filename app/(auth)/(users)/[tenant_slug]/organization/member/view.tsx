"use client";

import * as React from "react";
import {
  User,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Mail,
  Ban,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

import { useOrganizationMembers } from "./logic"; // Sesuaikan path-nya

export function OrganizationMembers() {
  const {
    t,
    activeOrgId,
    orgName,
    members,
    pendingInvites,
    maxUsers,
    inviteEmail,
    setInviteEmail,
    inviteRoleId,
    setInviteRoleId,
    isLoading,
    isInviting,
    alertMessage,
    setAlertMessage,
    memberToDelete,
    setMemberToDelete,
    handleRoleChange,
    handleConfirmRemoveMember,
    handleCancelInvitation,
    handleInviteSubmit,
    isLimitReached,
    canInvite,
    canRemove,
    assignableRoles,
    canManageMember
  } = useOrganizationMembers();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeOrgId) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Active Organization</AlertTitle>
          <AlertDescription>
            Silakan pilih organisasi terlebih dahulu di sidebar kiri Anda sebelum mengelola anggota.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4">
      {/* SHADCN ALERT NOTIFICATION */}
      {alertMessage && (
        <Alert
          variant={alertMessage.variant === "destructive" ? "destructive" : "default"}
          className="border-border/80 relative flex items-start gap-3 rounded-xl border pe-10">
          {alertMessage.variant === "destructive" ? (
            <AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <div className="space-y-1">
            <AlertTitle className="font-semibold">{alertMessage.title}</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {alertMessage.description}
            </AlertDescription>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-muted-foreground hover:text-foreground absolute end-4 top-4 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      {/* KONSOLIDASI: SATU CARD TUNGGAL UNTUK MEMBUNGKUS DAFTAR ANGGOTA & UNDANGAN */}
      <Card className="overflow-hidden">
        <CardContent className="divide-border/60 divide-y p-0">
          {/* Section 1: Manage Members List */}
          <div className="space-y-6 p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="space-y-1">
                <h2 className="text-foreground text-xl font-semibold tracking-tight">
                  {t("title")} ({orgName})
                </h2>
                <p className="text-muted-foreground text-sm">{t("subTitle")}</p>
              </div>
              <div className="bg-muted text-foreground/80 h-fit shrink-0 rounded-xl border px-4 py-2 text-xs font-medium">
                {t("limit", { count: members.length, max: maxUsers })}
              </div>
            </div>

            <Tabs defaultValue="active" className="w-full space-y-6">
              <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
                <TabsTrigger
                  value="active"
                  className="data-[state=active]:border-b-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-medium shadow-none transition-all data-[state=active]:bg-transparent">
                  {t("tabs.active")}
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="data-[state=active]:border-b-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-medium shadow-none transition-all data-[state=active]:bg-transparent">
                  {t("tabs.pending")} ({pendingInvites.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-0 space-y-3 focus-visible:outline-none">
                {members.length === 0 ? (
                  <div className="text-muted-foreground py-6 text-center text-sm">
                    {t("placeholders.noActive")}
                  </div>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="border-border/60 bg-card hover:bg-accent/5 flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="bg-muted border-border/60 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                          <User className="text-muted-foreground h-5 w-5" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-foreground truncate text-sm font-semibold">
                            {member.name}
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {member.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {canManageMember(member) ? (
                          <>
                            <Select
                              value={member.roleId ?? undefined}
                              onValueChange={(val: string) => handleRoleChange(member.id, val)}>
                              <SelectTrigger className="border-border/80 h-9 w-[110px] text-sm focus:ring-1">
                                <SelectValue placeholder="Select Role" />
                              </SelectTrigger>
                              <SelectContent>
                                {assignableRoles.map((r) => (
                                  <SelectItem key={r.id} value={r.id}>
                                    {r.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {canRemove && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground h-9 w-9">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem
                                    onClick={() => setMemberToDelete(member)}
                                    className="text-destructive focus:text-destructive flex cursor-pointer items-center gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Remove member
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </>
                        ) : (
                          <div className="border-border/40 bg-muted/30 text-muted-foreground flex h-9 w-[110px] items-center justify-between rounded-lg border px-3 py-1 text-sm select-none">
                            <span>{member.roleName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="pending" className="mt-0 space-y-3 focus-visible:outline-none">
                {pendingInvites.length === 0 ? (
                  <div className="text-muted-foreground py-10 text-center text-sm">
                    {t("placeholders.noPending")}
                  </div>
                ) : (
                  pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="border-border/60 bg-card flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="bg-muted border-border/60 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                          <Mail className="text-muted-foreground h-5 w-5" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-foreground truncate text-sm font-semibold">
                            {invite.email}
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {t("placeholders.invitedTo")} {invite.roleName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="border-border/40 bg-muted/20 text-muted-foreground flex h-9 items-center justify-between rounded-lg border px-3 py-1 text-xs select-none">
                          {t("placeholders.statusPending")}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancelInvitation(invite.id, invite.email)}
                          className="text-muted-foreground hover:text-destructive h-9 w-9"
                          title={t("placeholders.statusPending")}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Section 2: Invite a Member */}
          {canInvite && (
            <div className="space-y-6 p-8">
              <div className="space-y-1">
                <h2 className="text-foreground text-xl font-semibold tracking-tight">
                  {t("inviteCard.title")}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("inviteCard.desc")}
                </p>
              </div>

              {isLimitReached && (
                <Alert className="rounded-2xl border-amber-500/20 bg-amber-500/10 text-amber-600">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <AlertTitle>{t("inviteCard.limitAlertTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("inviteCard.limitAlertDesc", { max: maxUsers })}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-end">
                  <div className="w-full space-y-2 md:flex-1">
                    <label htmlFor="email" className="text-foreground text-sm font-semibold">
                      {t("inviteCard.email")}
                    </label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={isInviting || isLimitReached}
                      className="border-border/80 h-10 focus-visible:ring-1"
                    />
                  </div>

                  <div className="w-full space-y-2 md:w-[160px]">
                    <label htmlFor="role" className="text-foreground text-sm font-semibold">
                      {t("inviteCard.role")}
                    </label>
                    <Select
                      value={inviteRoleId}
                      onValueChange={setInviteRoleId}
                      disabled={isInviting || isLimitReached}>
                      <SelectTrigger id="role" className="border-border/80 h-10 focus:ring-1">
                        <SelectValue placeholder={t("inviteCard.selectRole")} />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableRoles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isInviting || isLimitReached || !inviteEmail.trim() || !inviteRoleId}
                    className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium">
                    {isInviting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isInviting ? t("inviteCard.btnSending") : t("inviteCard.btnInvite")}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SHADCN DIALOG KONFIRMASI HAPUS ANGGOTA */}
      <AlertDialog
        open={!!memberToDelete}
        onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogDelete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogDelete.desc", {
                name: memberToDelete?.name || "",
                email: memberToDelete?.email || ""
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialogDelete.btnCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveMember}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {t("dialogDelete.btnRemove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
