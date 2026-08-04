"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, CircleHelp, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PERMISSION_GROUPS } from "@/modules/rbac/shared";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { DataGrid, DataGridTable } from "@/components/data-table";
import { useAdminRoles, type RoleRow, type Permission } from "./logic";

interface SuperadminRolesPageProps {
  data: {
    rows: RoleRow[];
    permissions: Permission[];
  };
}

export function RolesView({ data }: SuperadminRolesPageProps) {
  const { rows, permissions } = data;

  const {
    t,
    isRtl,
    table,
    columns,
    error,
    panelOpen,
    setPanelOpen,
    selectedRole,
    saving,
    loadingPerms,
    formName,
    setFormName,
    selectedPerms,
    setSelectedPerms,
    deleteTargetId,
    setDeleteTargetId,
    openSections,
    toggleSection,
    togglePermission,
    handleOpenCreate,
    handleSave,
    confirmDelete
  } = useAdminRoles(rows, permissions);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="me-1.5 h-4 w-4" /> {t("new.title")}
        </Button>
      </div>

      {error && (
        <p className="text-destructive border-destructive/30 bg-destructive/10 animate-in fade-in rounded-lg border px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <DataGrid table={table} columns={columns}>
        <DataGridTable />
      </DataGrid>

      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("messages.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("messages.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("messages.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("messages.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Panel Form / Detail Menggunakan Sheet Shadcn */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent
          side={isRtl ? "left" : "right"}
          className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg md:max-w-xl">
          <form onSubmit={handleSave} className="relative flex h-full w-full flex-col">
            <SheetHeader className="border-border border-b p-6 text-start">
              <SheetTitle className="text-foreground text-xl font-bold">
                {selectedRole ? t("detail.editTitle") : t("new.title")}
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-sm">
                {selectedRole ? t("detail.desc") : t("new.desc")}
              </SheetDescription>
            </SheetHeader>

            {/* Scrollable Form Body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-6 pb-24">
              <div className="animate-in fade-in overflow-hidden">
                <Button
                  type="button"
                  onClick={() => toggleSection("general")}
                  className="bg-dropdown/50 hover:bg-dropdown flex w-full items-center justify-between border text-left transition-colors">
                  <span className="text-foreground text-sm font-semibold">{t("form.general")}</span>
                  {openSections.general ? (
                    <ChevronUp className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <ChevronDown className="text-muted-foreground h-4 w-4" />
                  )}
                </Button>

                {openSections.general && (
                  <div className="space-y-4 p-5">
                    <div className="space-y-2">
                      <Label htmlFor="panel-name">{t("new.nameLabel")}</Label>
                      <Input
                        id="panel-name"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Contoh: Administrator"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="animate-in fade-in overflow-hidden">
                <Button
                  type="button"
                  onClick={() => toggleSection("permissions")}
                  className="bg-dropdown/50 hover:bg-dropdown flex w-full items-center justify-between border text-left transition-colors">
                  <span className="text-foreground text-sm font-semibold">
                    {t("form.configurationaccess")}
                  </span>
                  {openSections.permissions ? (
                    <ChevronUp className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <ChevronDown className="text-muted-foreground h-4 w-4" />
                  )}
                </Button>

                {openSections.permissions && (
                  <div className="space-y-6 p-5">
                    {loadingPerms ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      PERMISSION_GROUPS.map((group) => {
                        const groupPerms = (permissions || []).filter((p) =>
                          group.names.includes(p.name as any)
                        );
                        const allSelected = groupPerms.every((p) => selectedPerms.has(p.id));
                        const someSelected =
                          groupPerms.some((p) => selectedPerms.has(p.id)) && !allSelected;
                        if (groupPerms.length === 0) return null;
                        return (
                          <div key={group.domain} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-foreground text-sm font-semibold">
                                {group.label}
                              </h4>
                              <Checkbox
                                checked={
                                  allSelected ? true : someSelected ? "indeterminate" : false
                                }
                                onCheckedChange={(checked) => {
                                  const next = new Set(selectedPerms);

                                  if (checked) {
                                    groupPerms.forEach((p) => next.add(p.id));
                                  } else {
                                    groupPerms.forEach((p) => next.delete(p.id));
                                  }

                                  setSelectedPerms(next);
                                }}
                              />
                            </div>

                            <div className="grid gap-1">
                              {groupPerms.map((p) => (
                                <label
                                  key={p.id}
                                  htmlFor={`perm-${p.id}`}
                                  className="hover:bg-accent/40 flex cursor-pointer items-center justify-between rounded-lg py-1 pl-2 transition-colors">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-foreground text-sm font-medium">
                                      {p.name}
                                    </span>

                                    {p.description && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              className="text-muted-foreground hover:text-foreground"
                                              onClick={(e) => e.preventDefault()}>
                                              <CircleHelp className="h-4 w-4" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top">
                                            <p>{p.description}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                  <Checkbox
                                    id={`perm-${p.id}`}
                                    checked={selectedPerms.has(p.id)}
                                    onCheckedChange={() => togglePermission(p.id)}
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Form (Tetap berada di bawah dengan blur-effect) */}
            <SheetFooter className="border-border bg-background/90 absolute right-0 bottom-0 left-0 z-10 flex flex-row items-center justify-end gap-3 border-t p-6 backdrop-blur-sm sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPanelOpen(false)}
                disabled={saving}>
                {t("messages.back")}
              </Button>
              <Button type="submit" disabled={saving || loadingPerms}>
                {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("detail.save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
