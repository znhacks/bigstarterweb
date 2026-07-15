// app/(auth)/(users)/[tenant_slug]/tasks/view.tsx
"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import type { FeatureGates } from "@/config/feature-definitions";
import { useTasks } from "./logic";
import type { Task } from "./types";
import { TasksDataTable } from "./data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/i18n/format";
import { getLocaleMeta } from "@/config/i18n-culture";

const STATUS_VALUES = ["todo", "in_progress", "done", "cancelled"] as const;
const PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;
const NONE = "__none__";

const EMPTY_FORM = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assignee_id: "" as string,
  due_date: "" as string
};

interface TasksViewProps {
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  featureGates: FeatureGates;
  planName?: string;
  // currentUsageCount TELAH DIHAPUS dari props karena dihitung real-time di logic.ts
}

export function TasksView({ tenantSlug, tenantId, tenantName, featureGates, planName }: TasksViewProps) {
  // Panggil hook tanpa mengirim currentUsageCount
  const h = useTasks({ tenantSlug, tenantId, tenantName }, { featureGates, planName });
  const { t, locale, timeZone, currentUsageCount } = h;

  const meta = getLocaleMeta(locale);

  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    if (h.isLimitReached) {
      setUpgradeDialogOpen(true);
      return;
    }
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (h.isLimitReached) {
      setCreateOpen(false);
      return;
    }
    if (!form.title.trim()) {
      setFormError(t("form.titleRequired"));
      return;
    }
    await h.createTask({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id || null,
      due_date: form.due_date ? `${form.due_date}T00:00:00.000Z` : null
    });
    setCreateOpen(false);
  };

  const memberName = (id: string | null | undefined) =>
    id ? h.members.find((m) => m.id === id)?.name || id : t("detail.unassigned");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8" dir={meta.dir}>
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>

        {/* Lencana Kuota Dinamis */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs">
            Plan: {h.planName} ({currentUsageCount}/{h.limit} Tasks)
          </Badge>
          {h.isLimitReached && (
            <Button size="sm" variant="destructive" onClick={() => setUpgradeDialogOpen(true)}>
              <CreditCard className="me-1.5 h-4 w-4" />
              Upgrade Now
            </Button>
          )}
        </div>
      </div>

      {/* Read-only banner */}
      {h.isReadOnly && (
        <Alert>
          <AlertTitle>{t("readOnly.title")}</AlertTitle>
          <AlertDescription>{t("readOnly.desc")}</AlertDescription>
        </Alert>
      )}

      {h.isLimitReached && (
        <Alert variant="destructive">
          <AlertTitle>Batas Kuota Tercapai</AlertTitle>
          <AlertDescription>
            Anda telah menggunakan {currentUsageCount} dari maksimal {h.limit} tugas untuk paket{" "}
            {h.planName}. Silakan tingkatkan paket Anda untuk melanjutkan pembuatan tugas.
          </AlertDescription>
        </Alert>
      )}

      {/* Alert hasil operasi */}
      {h.alertMessage && (
        <Alert variant={h.alertMessage.variant === "destructive" ? "destructive" : "default"}>
          <AlertTitle>{h.alertMessage.title}</AlertTitle>
          <AlertDescription>{h.alertMessage.description}</AlertDescription>
        </Alert>
      )}

      <div>
        {h.isLoading ? (
          <div className="flex min-h-100 items-center justify-center">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : (
          <TasksDataTable
            tasks={h.tasks}
            members={h.members}
            orgName={tenantName}
            canCreate={h.canCreate && !h.isLimitReached}
            canDelete={h.canDelete}
            canEditTask={h.canEditTask}
            onUpdate={h.updateTask}
            onView={(task) => setDetailTask(task)}
            onDelete={(task) => h.setTaskToDelete(task)}
            onCreateClick={openCreate}
            preferredLanguage={h.preferredLanguage}
            timeZone={timeZone}
          />
        )}
      </div>

      {/* DIALOG: PILIHAN GATEWAY PEMBAYARAN UNTUK UPGRADE */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md" dir={meta.dir}>
          <DialogHeader>
            <DialogTitle>Tingkatkan ke Paket Pro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-center">
            <p className="text-muted-foreground text-sm">
              Tingkatkan batas pembuatan tugas Anda menjadi <b>10.000 tugas</b> per bulan serta
              dapatkan dukungan prioritas. Pilih metode pembayaran Anda:
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Button
                variant="outline"
                onClick={() => h.handleUpgrade("mayar")}
                disabled={h.isUpgrading}
                className="flex h-20 flex-col items-center justify-center gap-1.5 text-xs">
                <span className="font-semibold text-blue-600">Mayar.id</span>
                <span className="text-muted-foreground text-[10px]">QRIS, VA, e-Wallet</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => h.handleUpgrade("paypal")}
                disabled={h.isUpgrading}
                className="flex h-20 flex-col items-center justify-center gap-1.5 text-xs">
                <span className="font-semibold text-yellow-600">PayPal</span>
                <span className="text-muted-foreground text-[10px]">Kartu / Saldo USD</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => h.handleUpgrade("paddle")}
                disabled={h.isUpgrading}
                className="flex h-20 flex-col items-center justify-center gap-1.5 text-xs">
                <span className="font-semibold text-purple-600">Paddle Billing</span>
                <span className="text-muted-foreground text-[10px]">Pajak Global Terhitung</span>
              </Button>
            </div>

            {h.isUpgrading && (
              <div className="text-muted-foreground mt-2 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin" />
                Menghubungkan ke gateway pembayaran...
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              variant="ghost"
              onClick={() => setUpgradeDialogOpen(false)}
              disabled={h.isUpgrading}>
              Kembali ke Aplikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Create task */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-130" dir={meta.dir}>
          {/* ... Sisa komponen dialog pembuatan task Anda tetap sama ... */}
          <DialogHeader>
            <DialogTitle>{t("form.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tk-title">{t("form.fields.title")}</Label>
              <Input
                id="tk-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("form.placeholders.title")}
              />
              {formError && <p className="text-destructive text-xs">{formError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tk-desc">{t("form.fields.description")}</Label>
              <Textarea
                id="tk-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("form.placeholders.description")}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("form.fields.status")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`data-table.statuses.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("form.fields.priority")}</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_VALUES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t(`data-table.priorities.${p}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("form.fields.assignee")}</Label>
                <Select
                  value={form.assignee_id || NONE}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, assignee_id: v === NONE ? "" : v }))
                  }>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("form.unassigned")}</SelectItem>
                    {h.members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tk-due">{t("form.fields.dueDate")}</Label>
                <Input
                  id="tk-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={h.isSaving}>
              {t("form.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={h.isSaving}>
              {h.isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("form.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Detail task */}
      <Dialog open={!!detailTask} onOpenChange={(o) => !o && setDetailTask(null)}>
        <DialogContent className="sm:max-w-140" dir={meta.dir}>
          <DialogHeader>
            <DialogTitle>{t("detail.title")}</DialogTitle>
          </DialogHeader>
          {detailTask && (
            <div className="space-y-4 py-2">
              <DetailField label={t("detail.fields.title")}>
                <span className="text-foreground font-semibold">{detailTask.title || "—"}</span>
              </DetailField>
              <DetailField label={t("detail.fields.description")}>
                <span className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {detailTask.description || t("detail.noDescription")}
                </span>
              </DetailField>
              <div className="grid grid-cols-2 gap-4">
                <DetailField label={t("detail.fields.status")}>
                  <Badge variant="secondary">{t(`data-table.statuses.${detailTask.status}`)}</Badge>
                </DetailField>
                <DetailField label={t("detail.fields.priority")}>
                  <Badge variant="outline">
                    {t(`data-table.priorities.${detailTask.priority}`)}
                  </Badge>
                </DetailField>
                <DetailField label={t("detail.fields.assignee")}>
                  <span className="text-sm">
                    {detailTask.assignee?.full_name || memberName(detailTask.assignee_id)}
                  </span>
                </DetailField>
                <DetailField label={t("detail.fields.createdBy")}>
                  <span className="text-sm">
                    {detailTask.creator?.full_name || memberName(detailTask.created_by)}
                  </span>
                </DetailField>

                <DetailField label={t("detail.fields.dueDate")}>
                  <span className="text-sm">
                    {detailTask.due_date
                      ? formatDateTime(detailTask.due_date, locale, { dateStyle: "long", timeZone })
                      : "—"}
                  </span>
                </DetailField>
                <DetailField label={t("detail.fields.createdAt")}>
                  <span className="text-muted-foreground text-sm">
                    {detailTask.created_at
                      ? formatDateTime(detailTask.created_at, locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone
                        })
                      : "—"}
                  </span>
                </DetailField>
                <DetailField label={t("detail.fields.updatedAt")}>
                  <span className="text-muted-foreground text-sm">
                    {detailTask.updated_at
                      ? formatDateTime(detailTask.updated_at, locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone
                        })
                      : "—"}
                  </span>
                </DetailField>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: Confirm delete */}
      <AlertDialog open={!!h.taskToDelete} onOpenChange={(o) => !o && h.setTaskToDelete(null)}>
        <AlertDialogContent dir={meta.dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("data-table.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {h.taskToDelete?.title ? `"${h.taskToDelete.title}"` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("form.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={h.confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("data-table.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <div>{children}</div>
    </div>
  );
}
