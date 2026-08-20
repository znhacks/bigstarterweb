"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Send } from "lucide-react";

import {
  DataGrid,
  DataGridToolbar,
  DataGridContent,
  DataGridSearch,
  DataGridTable,
  DataGridPagination,
  DataGridViewOptions,
  useDataGrid,
  textCol,
  actionCol
} from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { saveTemplate, sendTestNotification, toggleTemplate } from "../action";
import type { SuperadminCategory, SuperadminTemplate } from "../types";
import { getLocalizedValue } from "@/lib/i18n/localize";

interface FormState {
  title: Record<string, string>;
  body: Record<string, string>;
  channels: string[];
  link: string;
}

const EMPTY_FORM: FormState = { title: {}, body: {}, channels: [], link: "" };

export function TemplatesView({
  templates,
  categories
}: {
  templates: SuperadminTemplate[];
  categories: SuperadminCategory[];
}) {
  const t = useTranslations("superadmin.notifications.templates");
  const tRoot = useTranslations();
  const tNotif = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();

  const [rows, setRows] = React.useState<SuperadminTemplate[]>(templates);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [testUserId, setTestUserId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [activeLang, setActiveLang] = React.useState<string>("en");
  const [sections, setSections] = React.useState({
    content: true,
    channels: false,
    test: false
  });
  const toggle = (k: keyof typeof sections) => setSections((s) => ({ ...s, [k]: !s[k] }));

  const categoryLabel = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return id;
    try {
      return tRoot(cat.labelKey);
    } catch {
      return id;
    }
  };
  const channelLabel = (c: string) => {
    try {
      return tNotif(`channel.${c}`);
    } catch {
      return c;
    }
  };

  const translationStatus = EDITABLE_LOCALES.map((code) => ({
    code,
    isFilled: !!(form.title[code]?.trim() && form.body[code]?.trim())
  }));
  const completedLanguagesCount = translationStatus.filter((s) => s.isFilled).length;

  const openEdit = (row: SuperadminTemplate) => {
    setEditingId(row.id);
    setForm({
      title: { ...row.title },
      body: { ...row.body },
      channels: [...row.channels],
      link: row.link ?? ""
    });
    setActiveLang("en");
    setTestUserId("");
    setSections({ content: true, channels: false, test: false });
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isEnabled: enabled } : r)));
    const res = await toggleTemplate(id, enabled);
    if (res.error) {
      toast.error(res.error);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isEnabled: !enabled } : r)));
    } else {
      toast.success(enabled ? t("toastEnabled") : t("toastDisabled"));
    }
    router.refresh();
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    const res = await saveTemplate({
      id: editingId,
      title: form.title,
      body: form.body,
      channels: form.channels,
      link: form.link || null
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(t("toastSaved"));
    setEditingId(null);
    router.refresh();
  };

  const handleTest = async () => {
    if (!editingId) return;
    if (!testUserId.trim()) {
      toast.error(t("toastTestNeedUser"));
      return;
    }
    setTesting(true);
    const res = await sendTestNotification(editingId, testUserId.trim());
    setTesting(false);
    if (res.error) toast.error(res.error);
    else toast.success(t("toastTestSent"));
    router.refresh();
  };

  const columns = [
    textCol<SuperadminTemplate>({
      key: "id",
      header: t("table.event"),
      cell: (row) => {
        const humanTitle = getLocalizedValue(row.title, locale) || row.id;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-xs text-foreground">{humanTitle}</span>
            <code className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded w-fit">
              {row.id}
            </code>
          </div>
        );
      },
      enableGlobalFilter: true
    }),
    textCol<SuperadminTemplate>({
      key: "category",
      header: t("table.category"),
      cell: (row) => <Badge variant="secondary">{categoryLabel(row.category)}</Badge>,
      enableGlobalFilter: true
    }),
    textCol<SuperadminTemplate>({
      key: "title",
      header: t("table.title"),
      cell: (row) => {
        const titleText = getLocalizedValue(row.title, locale);
        const bodyText = getLocalizedValue(row.body, locale);
        return (
          <div className="flex flex-col gap-0.5 max-w-[320px]">
            <span className="font-medium text-xs text-foreground truncate">{titleText || "—"}</span>
            {bodyText && (
              <span className="text-muted-foreground text-[11px] truncate" title={bodyText}>
                {bodyText}
              </span>
            )}
          </div>
        );
      },
      enableGlobalFilter: true
    }),
    textCol<SuperadminTemplate>({
      key: "channels",
      header: t("table.channels"),
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.channels.map((c) => (
            <Badge key={c} variant="outline" className="text-[10px]">
              {channelLabel(c)}
            </Badge>
          ))}
        </div>
      ),
      enableGlobalFilter: false
    }),
    textCol<SuperadminTemplate>({
      key: "isEnabled",
      header: t("table.enabled"),
      cell: (row) => (
        <Switch
          checked={row.isEnabled}
          onCheckedChange={(v) => handleToggle(row.id, v)}
          aria-label={t("table.enabled")}
        />
      ),
      enableGlobalFilter: false
    }),
    actionCol<SuperadminTemplate>({
      header: t("table.actions"),
      cell: (row) => (
        <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
          <Pencil className="size-3.5" />
          {t("buttons.edit")}
        </Button>
      ),
      enableGlobalFilter: false
    })
  ];
  const globalFilterFn = React.useCallback(
    (row: any, columnId: string, filterValue: any) => {
      const term = String(filterValue ?? "")
        .toLowerCase()
        .trim();

      if (!term) return true;

      const value = row.getValue(columnId);

      // Kasus 1: Kolom 'title' (bertipe Objek / Record<string, string>)
      if (columnId === "title") {
        if (value && typeof value === "object") {
          // Mencari ke seluruh nilai bahasa yang tersedia (misal: en, ar, dll)
          return Object.values(value).some((val) => String(val).toLowerCase().includes(term));
        }
      }

      // Kasus 2: Kolom 'category' (bertipe String)
      if (columnId === "category") {
        const categoryId = String(value ?? "");
        const translatedCategory = categoryLabel(categoryId);

        // Membantu user mencari berdasarkan ID kategori asli maupun label lokalisasinya
        return (
          categoryId.toLowerCase().includes(term) || translatedCategory.toLowerCase().includes(term)
        );
      }

      // Kasus default untuk tipe data string/primitive biasa (misal: 'id')
      return String(value ?? "")
        .toLowerCase()
        .includes(term);
    },
    [categories, tRoot] // Di-re-create jika data kategori atau fungsi translate berubah
  );

  const table = useDataGrid({
    columns,
    data: rows,
    globalFilterFn
  });

  return (
    <div className="mx-auto w-full space-y-3">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-2xl">
          {t("title")}
        </h1>
      </div>

      <DataGrid table={table} columns={columns} noResultsText={t("empty")}>
        <DataGridToolbar>
          <DataGridSearch global placeholder={t("placeholder.search")} />
          <DataGridViewOptions className="md:ms-auto" />
        </DataGridToolbar>
        <DataGridContent>
          <DataGridTable />
          <DataGridPagination />
        </DataGridContent>
      </DataGrid>

      <Sheet open={editingId !== null} onOpenChange={(o) => !o && setEditingId(null)}>
        <SheetContent
          side={locale === "ar" ? "left" : "right"}
          className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg md:max-w-xl">
          <SheetHeader className="border-border space-y-3 border-b p-6 text-start">
            <SheetTitle className="text-foreground text-xl font-bold">{t("form.title")}</SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">
              {t("form.desc")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {/* Section: Content (multibahasa) */}
            <Section
              open={sections.content}
              onToggle={() => toggle("content")}
              title={t("form.content")}>
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
                <Label htmlFor="tpl-title">{t("form.fieldTitle")}</Label>
                <Input
                  id="tpl-title"
                  value={form.title[activeLang] ?? ""}
                  placeholder={t("placeholder.fieldTitle")}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      title: { ...f.title, [activeLang]: e.target.value }
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-body">{t("form.fieldBody")}</Label>
                <Textarea
                  id="tpl-body"
                  rows={3}
                  value={form.body[activeLang] ?? ""}
                  placeholder={t("placeholder.fieldBody")}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      body: { ...f.body, [activeLang]: e.target.value }
                    }))
                  }
                />
              </div>
            </Section>

            {/* Section: Channels & Link */}
            <Section
              open={sections.channels}
              onToggle={() => toggle("channels")}
              title={t("form.channels")}>
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
              <div className="space-y-1.5">
                <Label htmlFor="tpl-link">{t("form.fieldLink")}</Label>
                <Input
                  id="tpl-link"
                  placeholder="/billing"
                  value={form.link}
                  onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                />
              </div>
            </Section>

            {/* Section: Test */}
            <Section open={sections.test} onToggle={() => toggle("test")} title={t("form.testing")}>
              <div className="flex gap-2">
                <Input
                  placeholder="user-uuid"
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                />
                <Button variant="secondary" onClick={handleTest} disabled={testing}>
                  <Send className="size-3.5" />
                  {testing ? t("buttons.testing") : t("buttons.test")}
                </Button>
              </div>
            </Section>
          </div>

          <SheetFooter className="border-border bg-muted/20 flex flex-row items-center justify-end gap-3 border-t p-6 sm:justify-end">
            <Button variant="outline" onClick={() => setEditingId(null)} disabled={saving}>
              {t("buttons.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("buttons.saving") : t("buttons.save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
