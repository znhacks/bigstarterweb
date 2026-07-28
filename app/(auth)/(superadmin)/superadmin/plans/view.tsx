"use client";

import React from "react";
import { Loader2, Plus, ShieldAlert, Check, Info, ChevronDown, ChevronUp, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { tenantConfig } from "@/config/tenant";
import { FEATURE_DEFINITIONS, FeatureDefinition } from "@/config/feature-definitions";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";

import { useAdminPlans, PROVIDER_FIELDS, getLocalizedValue, SUPPORTED_LOCALES } from "./logic";
import { formatNumber } from "@/lib/i18n/format";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AdminPlansPage() {
  const {
    t,
    locale,
    isLoading,
    isSaving,
    isDeleting,
    errorMsg,
    successMsg,
    dialogOpen,
    setDialogOpen,
    isEditMode,
    form,
    setForm,
    formGates,
    setFormGates,
    deactivateTarget,
    setDeactivateTarget,
    deleteTarget,
    setDeleteTarget,
    conflictTarget,
    setConflictTarget,
    bulkConfirmOpen,
    setBulkConfirmOpen,
    isBulkDeactivating,
    isMonthlyEnabled,
    setIsMonthlyEnabled,
    isYearlyEnabled,
    setIsYearlyEnabled,
    enabledMonthlyProviders,
    setEnabledMonthlyProviders,
    enabledYearlyProviders,
    setEnabledYearlyProviders,
    table,
    columns,
    selectedRows,
    selectedActiveCount,
    handleOpenCreate,
    handleOpenEdit,
    handleSavePlan,
    confirmDeactivate,
    confirmDelete,
    handleBulkDeactivate,
    activeFormTab,
    setActiveFormTab
  } = useAdminPlans();

  const isRtl = locale === "ar";

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    general: true,
    features: false,
    billing: false
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const activeLangMeta = SUPPORTED_LOCALES.find((lang) => lang.code === activeFormTab);
  const activePlaceholderLabel = activeLangMeta?.placeholder || activeFormTab;

  return (
    <div className="mx-auto w-full space-y-6 px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subTitle")}</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="me-1.5 h-4 w-4" /> {t("buttons.create")}
        </Button>
      </div>

      {successMsg && (
        <Alert className="border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          <AlertTitle>{t("alerts.saveSuccess")}</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{t("alerts.error")}</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-row flex-wrap items-center gap-2">
        <DataTableSearch table={table} columnId="name" placeholder={t("table.search")} />

        {selectedRows.length > 0 && (
          <Button
            variant="destructive"
            className="h-9 text-xs"
            onClick={() => setBulkConfirmOpen(true)}
            disabled={selectedActiveCount === 0}>
            {t("buttons.deactiveselected", { length: formatNumber(selectedRows.length, locale) })}
          </Button>
        )}

        <DataTableViewOptions table={table} className="md:ms-auto" label={t("column")} />
      </div>

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <DataTable table={table} columns={columns} noResultsText={t("table.noData")} />
          <DataTablePagination
            table={table}
            pageSizeOptions={[10, 20, 50, 100]}
            rowsPerPageLabel={t("table.rowsPerPage")}
            selectedLabel={(selected, total) => `${selected} / ${total} ${t("selected")}`}
          />
        </>
      )}

      {}
      {dialogOpen && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 min-h-full bg-black/40 transition-opacity duration-300"
          onClick={() => setDialogOpen(false)}
        />
      )}

      <div
        className={`border-border bg-background fixed inset-y-0 z-50 flex h-full w-full flex-col shadow-2xl transition-[transform,opacity] duration-300 ease-in-out sm:max-w-lg md:max-w-xl ${
          isRtl ? "left-0 border-r" : "right-0 border-l"
        } ${
          dialogOpen
            ? "pointer-events-auto translate-x-0 opacity-100"
            : isRtl
              ? "pointer-events-none -translate-x-full opacity-0"
              : "pointer-events-none translate-x-full opacity-0"
        }`}>
        <div className="border-border flex items-center justify-between border-b p-6">
          <div className="space-y-1.5">
            <h2 className="text-foreground text-xl font-bold">
              {isEditMode ? t("form.titleEdit") : t("form.titleCreate")}
            </h2>
            <p className="text-muted-foreground text-sm">{t("form.desc")}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setDialogOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="overflow-hidden">
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
              <div className="space-y-6 p-5">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    {t("form.language-plans")}
                  </Label>
                  <div className="border-border flex flex-wrap gap-2 border-b pb-3">
                    {SUPPORTED_LOCALES.map((lang) => (
                      <Button
                        key={lang.code}
                        type="button"
                        variant={activeFormTab === lang.code ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveFormTab(lang.code)}
                        className="text-xs font-semibold uppercase">
                        {lang.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-id">{t("form.planId")}</Label>
                    <Input
                      id="plan-id"
                      disabled={isEditMode}
                      value={form.id}
                      onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                      placeholder={t("form.planIdPlaceholder")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-name">
                      {t("form.planName")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="plan-name"
                      value={form.name[activeFormTab] || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          name: { ...f.name, [activeFormTab]: e.target.value }
                        }))
                      }
                      placeholder={t("form.placeholder.languageName", {
                        language: activePlaceholderLabel
                      })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-desc">
                    {t("form.description")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="plan-desc"
                    value={form.description[activeFormTab] || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        description: { ...f.description, [activeFormTab]: e.target.value }
                      }))
                    }
                    placeholder={t("form.placeholder.desc", {
                      language: activePlaceholderLabel
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-display">{t("form.displayFeatures")}</Label>
                  <Textarea
                    id="plan-display"
                    rows={3}
                    value={form.displayFeaturesRaw[activeFormTab] || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        displayFeaturesRaw: {
                          ...f.displayFeaturesRaw,
                          [activeFormTab]: e.target.value
                        }
                      }))
                    }
                    placeholder={t("form.placeholder.displayFeature", {
                      language: activePlaceholderLabel
                    })}
                  />
                </div>

                {}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-recommended" className="cursor-pointer">
                      {t("form.recommended") || "Recommended"}
                    </Label>
                    <Switch
                      id="plan-recommended"
                      checked={!!form.isRecommended}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, isRecommended: !!v }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-trial">{t("form.trialDays") || "Trial (hari)"}</Label>
                    <Input
                      id="plan-trial"
                      type="number"
                      min={0}
                      value={form.trialDays || 0}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, trialDays: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-sort-order">
                      {t("form.sort-order") || "Urutan Tampilan"}
                    </Label>
                    <Input
                      id="plan-sort-order"
                      type="number"
                      min={0}
                      value={form.sortOrder}
                      onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                      placeholder={t("form.placeholder.sort-order") || "Otomatis"}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <Button
              type="button"
              onClick={() => toggleSection("features")}
              className="bg-dropdown/50 hover:bg-dropdown flex w-full items-center justify-between border text-left transition-colors">
              <span className="text-foreground text-sm font-semibold">
                {t("form.features-configuration")}
              </span>
              {openSections.features ? (
                <ChevronUp className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              )}
            </Button>

            {openSections.features && (
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {FEATURE_DEFINITIONS.map((def: FeatureDefinition) => (
                    <div
                      key={def.key}
                      className="border-border/60 bg-muted/10 flex flex-col justify-between gap-2 rounded-xl border p-3.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold">{def.label}</Label>
                      </div>
                      <div className="pt-2">
                        {def.type === "boolean" ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!!formGates[def.key]}
                              onCheckedChange={(checked) =>
                                setFormGates((prev) => ({ ...prev, [def.key]: checked }))
                              }
                            />
                            <span className="text-muted-foreground text-xs font-medium">
                              {formGates[def.key] ? t("form.gateActive") : t("form.gateInactive")}
                            </span>
                          </div>
                        ) : (
                          <Input
                            type="number"
                            value={formGates[def.key] ?? 0}
                            onChange={(e) =>
                              setFormGates((prev) => ({
                                ...prev,
                                [def.key]: parseInt(e.target.value) || 0
                              }))
                            }
                            className="h-8 max-w-30 text-xs"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <Button
              type="button"
              onClick={() => toggleSection("billing")}
              className="bg-dropdown/50 hover:bg-dropdown flex w-full items-center justify-between border text-left transition-colors">
              <span className="text-foreground text-sm font-semibold">
                {t("form.payment-gateway")}
              </span>
              {openSections.billing ? (
                <ChevronUp className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              )}
            </Button>

            {openSections.billing && (
              <div className="space-y-6 p-5">
                <div className="flex flex-col gap-6">
                  <div className="border-border/60 bg-muted/5 space-y-4 rounded-xl border p-5">
                    <div className="border-border/40 flex items-center space-x-2 border-b pb-3">
                      <Checkbox
                        id="enable-monthly"
                        checked={isMonthlyEnabled}
                        onCheckedChange={(checked) => {
                          setIsMonthlyEnabled(!!checked);
                          if (!checked) {
                            setForm((f) => ({ ...f, monthlyAmount: 0 }));
                          }
                        }}
                      />
                      <Label
                        htmlFor="enable-monthly"
                        className="cursor-pointer text-sm font-bold select-none">
                        {t("form.monthly.title")}
                      </Label>
                    </div>

                    <div
                      className={`space-y-4 transition-opacity duration-200 ${!isMonthlyEnabled ? "opacity-50" : ""}`}>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="monthly-amount"
                          className={!isMonthlyEnabled ? "cursor-not-allowed" : ""}>
                          {t("form.monthly.amount")}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="monthly-amount"
                            type="number"
                            disabled={!isMonthlyEnabled}
                            value={form.monthlyAmount || ""}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                monthlyAmount: parseFloat(e.target.value) || 0
                              }))
                            }
                            placeholder="0"
                            className="flex-1"
                          />
                          <Select
                            value={form.monthlyCurrency || "IDR"}
                            onValueChange={(v) => setForm((f) => ({ ...f, monthlyCurrency: v }))}
                            disabled={!isMonthlyEnabled}>
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {tenantConfig.supported.currencies.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <Label
                          htmlFor="monthly-product-id"
                          className={!isMonthlyEnabled ? "cursor-not-allowed" : ""}>
                          {t("form.monthly.id-gateway")}
                        </Label>
                        <Input
                          id="monthly-product-id"
                          disabled={!isMonthlyEnabled}
                          value={form.monthlyProductId || ""}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, monthlyProductId: e.target.value }))
                          }
                          placeholder={t("form.planIdPlaceholder")}
                          className="h-9 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {}
                  <div className="border-border/60 bg-muted/5 space-y-4 rounded-xl border p-5">
                    <div className="border-border/40 flex items-center space-x-2 border-b pb-3">
                      <Checkbox
                        id="enable-yearly"
                        checked={isYearlyEnabled}
                        onCheckedChange={(checked) => {
                          setIsYearlyEnabled(!!checked);
                          if (!checked) {
                            setForm((f) => ({ ...f, yearlyAmount: 0 }));
                          }
                        }}
                      />
                      <Label
                        htmlFor="enable-yearly"
                        className="cursor-pointer text-sm font-bold select-none">
                        {t("form.yearly.title")}
                      </Label>
                    </div>

                    <div
                      className={`space-y-4 transition-opacity duration-200 ${!isYearlyEnabled ? "opacity-50" : ""}`}>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="yearly-amount"
                          className={!isYearlyEnabled ? "cursor-not-allowed" : ""}>
                          {t("form.yearly.amount")}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="yearly-amount"
                            type="number"
                            disabled={!isYearlyEnabled}
                            value={form.yearlyAmount || ""}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                yearlyAmount: parseFloat(e.target.value) || 0
                              }))
                            }
                            placeholder="0"
                            className="flex-1"
                          />
                          <Select
                            value={form.yearlyCurrency || "IDR"}
                            onValueChange={(v) => setForm((f) => ({ ...f, yearlyCurrency: v }))}
                            disabled={!isYearlyEnabled}>
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {tenantConfig.supported.currencies.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <Label
                          htmlFor="yearly-product-id"
                          className={!isYearlyEnabled ? "cursor-not-allowed" : ""}>
                          {t("form.yearly.id-gateway")}
                        </Label>
                        <Input
                          id="yearly-product-id"
                          disabled={!isYearlyEnabled}
                          value={form.yearlyProductId || ""}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, yearlyProductId: e.target.value }))
                          }
                          placeholder={t("form.planIdPlaceholder")}
                          className="h-9 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-border bg-muted/20 flex items-center justify-end gap-3 border-t p-6">
          <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
            {t("buttons.back")}
          </Button>
          <Button onClick={() => handleSavePlan(false)} disabled={isSaving}>
            {isSaving && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />} {t("buttons.save")}
          </Button>
        </div>
      </div>

      {}
      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deactivateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("alerts.deactivateDesc", {
                name: deactivateTarget ? getLocalizedValue(deactivateTarget.name, locale) : ""
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("buttons.confirmDeactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? t("alerts.deleteDesc", { name: getLocalizedValue(deleteTarget.name, locale) })
                : "Apakah Anda yakin ingin menghapus paket ini secara permanen?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
              {t("buttons.confirmDelete") || "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <AlertDialog
        open={bulkConfirmOpen}
        onOpenChange={(open) => !open && setBulkConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deactivateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("alerts.deactivateDesc", { name: `${selectedActiveCount} plan terpilih` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeactivating}>
              {t("buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeactivate}
              disabled={isBulkDeactivating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isBulkDeactivating && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
              {t("buttons.confirmDeactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {}
      <AlertDialog
        open={!!conflictTarget}
        onOpenChange={(open) => !open && setConflictTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <Info className="h-5 w-5 shrink-0 text-amber-500" />
              <span>Peringatan Bentrok Urutan</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Urutan tampilan <strong>{conflictTarget?.order}</strong> sudah digunakan oleh paket{" "}
                <strong>"{conflictTarget?.planName}"</strong>.
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Jika Anda menyetujui, sistem akan otomatis melakukan pergeseran berantai pada paket
                tersebut serta paket-paket setelahnya dengan menaikkan nilai urutan mereka sebesar
                (+1) agar susunan tetap konsisten dan tidak ada duplikasi.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConflictTarget(null);
                handleSavePlan(true);
              }}
              className="bg-amber-600 text-white hover:bg-amber-700">
              Lanjutkan & Geser Paket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
