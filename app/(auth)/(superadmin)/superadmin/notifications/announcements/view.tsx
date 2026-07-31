"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Send, Trash2 } from "lucide-react";

import {
  DataGrid,
  DataGridPagination,
  DataGridSearch,
  DataGridTable,
  DataGridToolbar,
  DataGridViewOptions,
  useDataTable,
  textCol,
  dateCol,
  actionCol
} from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { NOTIFICATION_CHANNELS } from "@/config/notification-definitions";
import { EDITABLE_LOCALES, LanguageTabs, Section } from "../form-helpers";
import { createAnnouncement, deleteAnnouncement, publishAnnouncement } from "../action";
import type { SuperadminAnnouncement } from "../types";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  sending: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  sent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  failed: "bg-destructive/15 text-destructive"
};

interface FormState {
  title: Record<string, string>;
  body: Record<string, string>;
  audience: string;
  channels: string[];
  scheduleMode: "now" | "later";
  scheduledFor: string;
  tenantIds: string[];
  userIds: string[];
}

const EMPTY_FORM: FormState = {
  title: {},
  body: {},
  audience: "all_users",
  channels: ["in_app", "email"],
  scheduleMode: "now",
  scheduledFor: "",
  tenantIds: [],
  userIds: []
};

export function AnnouncementsView({
  announcements,
  tenants,
  users
}: {
  announcements: SuperadminAnnouncement[];
  tenants: { id: string; name: string }[];
  users: { id: string; email: string | null }[];
}) {
  const t = useTranslations("superadmin.notifications.announcements");
  const tNotif = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();

  const [rows] = React.useState(announcements);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [activeLang, setActiveLang] = React.useState<string>("en");
  const [sections, setSections] = React.useState({
    content: true,
    audience: false,
    channels: false,
    schedule: false
  });
  const toggle = (k: keyof typeof sections) => setSections((s) => ({ ...s, [k]: !s[k] }));

  const channelLabel = (c: string) => {
    try {
      return tNotif(`channel.${c}`);
    } catch {
      return c;
    }
  };
  const audienceLabel = (a: string) => {
    try {
      return t(`audience_${a}`);
    } catch {
      return a;
    }
  };
  const statusLabel = (s: string) => {
    try {
      return t(`status_${s}`);
    } catch {
      return s;
    }
  };

  const translationStatus = EDITABLE_LOCALES.map((code) => ({
    code,
    isFilled: !!(form.title[code]?.trim() && form.body[code]?.trim())
  }));
  const completedLanguagesCount = translationStatus.filter((s) => s.isFilled).length;
  const contentError = completedLanguagesCount === 0;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setActiveLang("en");
    setSections({ content: true, audience: false, channels: false, schedule: false });
    setOpen(true);
  };

  const handleCreate = async () => {
    if (contentError) {
      toast.error(t("fieldTitle"));
      setSections((s) => ({ ...s, content: true }));
      return;
    }
    setSaving(true);
    const res = await createAnnouncement({
      title: form.title,
      body: form.body,
      audience: form.audience,
      channels: form.channels,
      scheduledFor: form.scheduleMode === "later" ? form.scheduledFor : null,
      targetTenantIds: form.audience === "specific_tenant" ? form.tenantIds : undefined,
      targetUserIds: form.audience === "selected_users" ? form.userIds : undefined
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(form.scheduleMode === "later" ? t("toastScheduled") : t("toastSent"));
    setOpen(false);
    router.refresh();
  };

  const handlePublish = async (id: string) => {
    const res = await publishAnnouncement(id);
    if (res.error) toast.error(res.error);
    else toast.success(t("toastSent"));
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    const res = await deleteAnnouncement(id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(t("toastDeleted"));
    router.refresh();
  };

  const columns = [
    textCol<SuperadminAnnouncement>({
      key: "title",
      header: t("colTitle"),
      cell: (row) => row.title?.en ?? row.title?.[Object.keys(row.title)[0]] ?? "—"
    }),
    textCol<SuperadminAnnouncement>({
      key: "audience",
      header: t("colAudience"),
      cell: (row) => <Badge variant="secondary">{audienceLabel(row.audience)}</Badge>
    }),
    textCol<SuperadminAnnouncement>({
      key: "channels",
      header: t("colChannels"),
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.channels.map((c) => (
            <Badge key={c} variant="outline" className="text-[10px]">
              {channelLabel(c)}
            </Badge>
          ))}
        </div>
      )
    }),
    textCol<SuperadminAnnouncement>({
      key: "status",
      header: t("colStatus"),
      cell: (row) => (
        <span
          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
            STATUS_TONE[row.status] ?? ""
          }`}>
          {statusLabel(row.status)}
        </span>
      )
    }),
    dateCol<SuperadminAnnouncement>({
      key: "createdAt",
      header: t("colCreated"),
      cell: (row) => (
        <div className="text-end tabular-nums">
          {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
        </div>
      )
    }),
    actionCol<SuperadminAnnouncement>({
      header: t("colActions"),
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {(row.status === "draft" || row.status === "scheduled" || row.status === "failed") && (
            <Button size="sm" variant="ghost" onClick={() => handlePublish(row.id)}>
              <Send className="size-3.5" />
              {t("btnPublish")}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}>
            <Trash2 className="text-destructive size-3.5" />
          </Button>
        </div>
      )
    })
  ];

  const table = useDataTable({ columns, data: rows });

  return (
    <div className="mx-auto w-full space-y-3">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-2xl">
          {t("title")}
        </h1>
        <Button onClick={openCreate}>
          <Plus className="me-1.5 h-4 w-4" /> {t("btnCreate")}
        </Button>
      </div>

      <DataGrid table={table} columns={columns} noResultsText={t("empty")}>
        <DataGridToolbar>
          <DataGridSearch columnId="title" placeholder={t("searchPlaceholder")} />
          <DataGridViewOptions className="md:ms-auto" />
        </DataGridToolbar>
        <DataGridTable />
        <DataGridPagination />
      </DataGrid>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={locale === "ar" ? "left" : "right"}
          className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg md:max-w-xl">
          <SheetHeader className="border-border space-y-3 border-b p-6 text-start">
            <SheetTitle className="text-foreground text-xl font-bold">{t("panelTitle")}</SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">
              {t("panelDescription")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {/* Section: Content (multibahasa) */}
            <Section
              open={sections.content}
              onToggle={() => toggle("content")}
              title={t("form.sectionContent")}
              error={contentError}>
              <LanguageTabs
                status={translationStatus}
                active={activeLang}
                onChange={setActiveLang}
                completedCount={completedLanguagesCount}
                total={EDITABLE_LOCALES.length}
                languageLabel={t("form.language")}
                filledLabel={t("form.filledLanguage")}
              />

              <div className="space-y-1.5">
                <Label htmlFor="ann-title">
                  {t("fieldTitle")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ann-title"
                  value={form.title[activeLang] ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: { ...f.title, [activeLang]: e.target.value } }))
                  }
                  placeholder={t("fieldTitle")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-body">{t("fieldBody")}</Label>
                <Textarea
                  id="ann-body"
                  rows={4}
                  value={form.body[activeLang] ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, body: { ...f.body, [activeLang]: e.target.value } }))
                  }
                  placeholder={t("fieldBody")}
                />
              </div>
            </Section>

            {/* Section: Audience */}
            <Section
              open={sections.audience}
              onToggle={() => toggle("audience")}
              title={t("form.sectionAudience")}>
              <RadioGroup
                value={form.audience}
                onValueChange={(v) => setForm((f) => ({ ...f, audience: v }))}
                className="gap-3">
                {["all_users", "specific_tenant", "selected_users"].map((a) => (
                  <div key={a} className="flex items-center gap-2">
                    <RadioGroupItem value={a} id={`aud-${a}`} />
                    <Label htmlFor={`aud-${a}`} className="text-sm font-normal">
                      {audienceLabel(a)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {form.audience === "specific_tenant" && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    {t("fieldTenants")}
                  </Label>
                  <ScrollArea className="h-40 rounded-md border p-2">
                    <div className="space-y-1">
                      {tenants.map((tn) => (
                        <label key={tn.id} className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={form.tenantIds.includes(tn.id)}
                            onCheckedChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                tenantIds: v
                                  ? [...f.tenantIds, tn.id]
                                  : f.tenantIds.filter((x) => x !== tn.id)
                              }))
                            }
                          />
                          {tn.name}
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {form.audience === "selected_users" && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    {t("fieldUsers")}
                  </Label>
                  <ScrollArea className="h-40 rounded-md border p-2">
                    <div className="space-y-1">
                      {users.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={form.userIds.includes(u.id)}
                            onCheckedChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                userIds: v
                                  ? [...f.userIds, u.id]
                                  : f.userIds.filter((x) => x !== u.id)
                              }))
                            }
                          />
                          {u.email ?? u.id}
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </Section>

            {/* Section: Channels */}
            <Section
              open={sections.channels}
              onToggle={() => toggle("channels")}
              title={t("form.sectionChannels")}>
              <div className="border-border/50 divide-border/40 bg-muted/5 divide-y overflow-hidden rounded-xl border">
                {NOTIFICATION_CHANNELS.map((c) => {
                  const on = form.channels.includes(c.key);
                  return (
                    <div
                      key={c.key}
                      className="hover:bg-muted/10 flex items-center justify-between p-3 transition-colors">
                      <span className="text-foreground pr-2 text-xs font-semibold">
                        {channelLabel(c.key)}
                      </span>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span
                          className={`text-[9px] font-bold tracking-wide transition-colors ${
                            on ? "text-emerald-500" : "text-muted-foreground/60"
                          }`}>
                          {on ? t("form.active") : t("form.inactive")}
                        </span>
                        <Switch
                          checked={on}
                          onCheckedChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              channels: v
                                ? [...f.channels, c.key]
                                : f.channels.filter((x) => x !== c.key)
                            }))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Section: Schedule */}
            <Section
              open={sections.schedule}
              onToggle={() => toggle("schedule")}
              title={t("form.sectionSchedule")}>
              <RadioGroup
                value={form.scheduleMode}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, scheduleMode: v as "now" | "later" }))
                }
                className="gap-3">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="now" id="sch-now" />
                  <Label htmlFor="sch-now" className="text-sm font-normal">
                    {t("scheduleNow")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="later" id="sch-later" />
                  <Label htmlFor="sch-later" className="text-sm font-normal">
                    {t("scheduleLater")}
                  </Label>
                </div>
              </RadioGroup>
              {form.scheduleMode === "later" && (
                <Input
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                />
              )}
            </Section>
          </div>

          <SheetFooter className="border-border bg-muted/20 flex flex-row items-center justify-end gap-3 border-t p-6 sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t("btnCancel")}
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving
                ? t("btnSending")
                : form.scheduleMode === "later"
                  ? t("btnSchedule")
                  : t("btnSendNow")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
