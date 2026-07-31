"use client";

import React from "react";
import {
  Loader2,
  Plus,
  ShieldAlert,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  InfoIcon,
  Search,
  Ban,
  Trash2
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { tenantConfig } from "@/config/tenant";
import { FEATURE_DEFINITIONS, FeatureDefinition } from "@/config/feature-definitions";

import { useAdminPlans, PROVIDER_FIELDS, getLocalizedValue, SUPPORTED_LOCALES } from "./logic";
import { formatNumber } from "@/lib/i18n/format";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import {
  DataGrid,
  DataGridContent,
  DataGridBulkActions,
  DataGridPagination,
  DataGridSearch,
  DataGridTable,
  DataGridToolbar,
  DataGridViewOptions
} from "@/components/data-table";

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
    errors,
    setErrors,
    openSections,
    toggleSection,
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
    setActiveFormTab,
    translationStatus,
    completedLanguagesCount,
    featureSearch,
    setFeatureSearch,
    filteredFeatures,
    numericFeatures,
    booleanFeatures,
    customFeatures,

    bulkDeleteConfirmOpen,
    setBulkDeleteConfirmOpen,
    isBulkDeleting,
    handleBulkDelete
  } = useAdminPlans();

  const isRtl = locale === "ar";

  const activeLangMeta = SUPPORTED_LOCALES.find((lang) => lang.code === activeFormTab);
  const activePlaceholderLabel = activeLangMeta?.placeholder || activeFormTab;

  return (
    <div className="mx-auto w-full space-y-3">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-2xl">
            {t("title")}
          </h1>
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

      <DataGrid table={table} columns={columns} noResultsText={t("table.noData")}>
        <DataGridToolbar>
          <DataGridSearch placeholder={t("table.search")} columnId="name" />

          <DataGridBulkActions
            table={table}
            label={t("buttons.bulkActions")}
            actions={[
              {
                label: t("buttons.deactivate"),
                icon: Ban,
                tone: "warning",
                disabled: (rows) => rows.every((r) => !r.is_active),
                onSelect: () => setBulkConfirmOpen(true)
              },
              {
                label: t("buttons.delete"),
                icon: Trash2,
                tone: "destructive",
                separator: true,
                onSelect: () => setBulkDeleteConfirmOpen(true)
              }
            ]}
          />

          <DataGridViewOptions className="md:ms-auto" label={t("column")} />
        </DataGridToolbar>

        <DataGridContent>
          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <DataGridTable />
              <DataGridPagination
                pageSizeOptions={[10, 20, 50, 100]}
                rowsPerPageLabel={t("table.rowsPerPage")}
                selectedLabel={(selected, total) => `${selected} / ${total} ${t("selected")}`}
              />
            </>
          )}
        </DataGridContent>
      </DataGrid>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent
          side={isRtl ? "left" : "right"}
          className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg md:max-w-xl">
          <SheetHeader className="border-border space-y-3 border-b p-6 text-start">
            <div className="flex items-center justify-between space-y-1.5">
              <SheetTitle className="text-foreground text-xl font-bold">
                {isEditMode ? t("form.titleEdit") : t("form.titleCreate")}
              </SheetTitle>
            </div>

            <div className="flex flex-row items-center gap-1">
              <SheetDescription className="text-muted-foreground text-sm">
                {t("form.desc")}
              </SheetDescription>
              <Link href="" className="text-blue-700">
                <InfoIcon size={15} />
              </Link>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="overflow-hidden">
              <Button
                type="button"
                onClick={() => toggleSection("general")}
                className={`bg-dropdown/50 hover:bg-dropdown flex w-full items-center justify-between border text-left transition-colors ${
                  errors.id || errors.name || errors.description ? "border-destructive/50" : ""
                }`}>
                <span className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  {t("form.general")}
                  {(errors.id || errors.name || errors.description) && (
                    <span className="bg-destructive inline-block h-2 w-2 rounded-full" />
                  )}
                </span>
                {openSections.general ? (
                  <ChevronUp className="text-muted-foreground h-4 w-4" />
                ) : (
                  <ChevronDown className="text-muted-foreground h-4 w-4" />
                )}
              </Button>

              {openSections.general && (
                <div className="space-y-6 p-5">
                  <div className="space-y-3 border-b pb-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                        {t("form.language-plans") || "Bahasa Paket"}
                      </Label>
                      <span className="text-muted-foreground text-xs font-semibold">
                        {completedLanguagesCount} / {SUPPORTED_LOCALES.length}{" "}
                        {t("form.filledLanguage")}
                      </span>
                    </div>

                    <div className="bg-muted/40 h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${(completedLanguagesCount / SUPPORTED_LOCALES.length) * 100}%`
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {translationStatus.map((status) => (
                        <button
                          key={status.code}
                          type="button"
                          onClick={() => setActiveFormTab(status.code)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase transition-all ${
                            activeFormTab === status.code
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted/20 hover:bg-muted/40 text-muted-foreground border-border/60"
                          }`}>
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              status.isFilled ? "bg-emerald-500" : "bg-muted-foreground/30"
                            }`}
                          />
                          {status.code}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-id">
                        {t("form.planId")} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="plan-id"
                        disabled={isEditMode}
                        value={form.id}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, id: e.target.value }));
                          if (errors.id)
                            setErrors((prev) => {
                              const { id, ...r } = prev;
                              return r;
                            });
                        }}
                        placeholder={t("form.planIdPlaceholder")}
                        className={
                          errors.id ? "border-destructive focus-visible:ring-destructive" : ""
                        }
                      />
                      {errors.id && (
                        <p className="text-destructive text-xs font-medium">{errors.id}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-name">
                        {t("form.planName")} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="plan-name"
                        value={form.name[activeFormTab] || ""}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            name: { ...f.name, [activeFormTab]: e.target.value }
                          }));
                          if (errors.name)
                            setErrors((prev) => {
                              const { name, ...r } = prev;
                              return r;
                            });
                        }}
                        placeholder={t("form.placeholder.languageName", {
                          language: activePlaceholderLabel
                        })}
                        className={
                          errors.name ? "border-destructive focus-visible:ring-destructive" : ""
                        }
                      />
                      {errors.name && (
                        <p className="text-destructive text-xs font-medium">{errors.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-desc">
                      {t("form.description")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="plan-desc"
                      value={form.description[activeFormTab] || ""}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          description: { ...f.description, [activeFormTab]: e.target.value }
                        }));
                        if (errors.description)
                          setErrors((prev) => {
                            const { description, ...r } = prev;
                            return r;
                          });
                      }}
                      placeholder={t("form.placeholder.desc", {
                        language: activePlaceholderLabel
                      })}
                      className={
                        errors.description
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    />
                    {errors.description && (
                      <p className="text-destructive text-xs font-medium">{errors.description}</p>
                    )}
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-trial">{t("form.trialDays")}</Label>

                      <div className="border-input focus-within:border-ring focus-within:ring-ring/20 flex h-9 overflow-hidden rounded-md border focus-within:ring-2">
                        <Input
                          id="plan-trial"
                          type="number"
                          min={0}
                          value={form.trialDays}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              trialDays: parseInt(e.target.value) || 0
                            }))
                          }
                          className="h-full flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                        />

                        <div className="bg-muted text-muted-foreground flex items-center border-l px-3 text-sm font-medium">
                          {t("form.days")}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-sort-order">{t("form.sort-order")}</Label>
                      <Input
                        id="plan-sort-order"
                        type="number"
                        min={0}
                        value={form.sortOrder}
                        onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                        placeholder={t("form.placeholder.sort-order")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-recommended" className="cursor-pointer">
                        {t("form.recommended")}
                      </Label>
                      <Switch
                        id="plan-recommended"
                        checked={!!form.isRecommended}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, isRecommended: !!v }))}
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
                  <div className="grid grid-cols-1 gap-6 pt-1 md:grid-cols-1">
                    <div className="space-y-6">
                      {numericFeatures.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                            {t("form.usageLimit")}
                          </h4>
                          <div className="border-border/50 divide-border/40 bg-muted/5 divide-y overflow-hidden rounded-xl border">
                            {numericFeatures.map((def) => (
                              <div
                                key={def.key}
                                className="hover:bg-muted/10 flex items-center justify-between p-3 transition-colors">
                                <span className="text-foreground pr-2 text-xs font-semibold">
                                  {def.label}
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={formGates[def.key] ?? 0}
                                  onChange={(e) =>
                                    setFormGates((prev) => ({
                                      ...prev,
                                      [def.key]: parseInt(e.target.value) || 0
                                    }))
                                  }
                                  className="h-8 w-20 text-right text-xs"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {booleanFeatures.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                            {t("form.featureAccess")}
                          </h4>
                          <div className="border-border/50 divide-border/40 bg-muted/5 divide-y overflow-hidden rounded-xl border">
                            {booleanFeatures.map((def) => (
                              <div
                                key={def.key}
                                className="hover:bg-muted/10 flex items-center justify-between p-3 transition-colors">
                                <span className="text-foreground pr-2 text-xs font-semibold">
                                  {def.label}
                                </span>
                                <div className="flex shrink-0 items-center gap-2.5">
                                  <span
                                    className={`text-[9px] font-bold tracking-wide transition-colors ${
                                      formGates[def.key]
                                        ? "text-emerald-500"
                                        : "text-muted-foreground/60"
                                    }`}>
                                    {formGates[def.key] ? t("form.active") : t("form.inactive")}
                                  </span>
                                  <Switch
                                    checked={!!formGates[def.key]}
                                    onCheckedChange={(checked) =>
                                      setFormGates((prev) => ({ ...prev, [def.key]: checked }))
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {customFeatures.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                            {t("form.customSettings")}
                          </h4>
                          <div className="border-border/50 divide-border/40 bg-muted/5 divide-y overflow-hidden rounded-xl border">
                            {customFeatures.map((def) => (
                              <div
                                key={def.key}
                                className="hover:bg-muted/10 flex items-center justify-between p-3 transition-colors">
                                <span className="text-foreground pr-2 text-xs font-semibold">
                                  {def.label}
                                </span>

                                {def.type === "select" && (
                                  <Select
                                    value={formGates[def.key] ?? def.defaultValue}
                                    onValueChange={(val) =>
                                      setFormGates((prev) => ({ ...prev, [def.key]: val }))
                                    }>
                                    <SelectTrigger className="h-8 w-44 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {def.options?.map((opt) => (
                                        <SelectItem
                                          key={opt.value}
                                          value={opt.value}
                                          className="text-xs">
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}

                                {def.type === "string" && (
                                  <Input
                                    type="text"
                                    value={formGates[def.key] ?? ""}
                                    onChange={(e) =>
                                      setFormGates((prev) => ({
                                        ...prev,
                                        [def.key]: e.target.value
                                      }))
                                    }
                                    className="h-8 w-44 text-xs"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-hidden">
              <Button
                type="button"
                onClick={() => toggleSection("billing")}
                className={`bg-dropdown/50 hover:bg-dropdown flex w-full items-center justify-between border text-left transition-colors ${
                  errors.billing ? "border-destructive/50" : ""
                }`}>
                <span className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  {t("form.payment-gateway")}
                  {errors.billing && (
                    <span className="bg-destructive inline-block h-2 w-2 rounded-full" />
                  )}
                </span>
                {openSections.billing ? (
                  <ChevronUp className="text-muted-foreground h-4 w-4" />
                ) : (
                  <ChevronDown className="text-muted-foreground h-4 w-4" />
                )}
              </Button>

              {openSections.billing && (
                <div className="space-y-6 p-5">
                  {errors.billing && (
                    <div className="border-destructive/20 bg-destructive/5 text-destructive rounded-lg border p-3 text-xs font-semibold">
                      {errors.billing}
                    </div>
                  )}
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
                            if (errors.billing)
                              setErrors((prev) => {
                                const { billing, ...r } = prev;
                                return r;
                              });
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
                              onChange={(e) => {
                                setForm((f) => ({
                                  ...f,
                                  monthlyAmount: parseFloat(e.target.value) || 0
                                }));
                                if (errors.billing)
                                  setErrors((prev) => {
                                    const { billing, ...r } = prev;
                                    return r;
                                  });
                              }}
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
                            if (errors.billing)
                              setErrors((prev) => {
                                const { billing, ...r } = prev;
                                return r;
                              });
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
                              onChange={(e) => {
                                setForm((f) => ({
                                  ...f,
                                  yearlyAmount: parseFloat(e.target.value) || 0
                                }));
                                if (errors.billing)
                                  setErrors((prev) => {
                                    const { billing, ...r } = prev;
                                    return r;
                                  });
                              }}
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

          <SheetFooter className="border-border bg-muted/20 flex flex-row items-center justify-end gap-3 border-t p-6 sm:justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              {t("buttons.back")}
            </Button>
            <Button onClick={() => handleSavePlan(false)} disabled={isSaving}>
              {isSaving && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />} {t("buttons.save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? t("alerts.deleteDesc", { name: getLocalizedValue(deleteTarget.name, locale) })
                : t("alerts.permanentDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
              {t("buttons.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <AlertDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={(open) => !open && setBulkDeleteConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("alerts.deleteSelected", {
                selectedRows: formatNumber(selectedRows.length, locale)
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>{t("buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isBulkDeleting && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
              {t("buttons.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!conflictTarget}
        onOpenChange={(open) => !open && setConflictTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <Info className="h-5 w-5 shrink-0 text-amber-500" />
              <span>{t("alerts.orderConflictWarning.title")}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {t.rich("alerts.orderConflictWarning.desc", {
                  order: conflictTarget?.order ?? "-",
                  planName: conflictTarget?.planName ?? "-",
                  strong: (chunks) => <strong>{chunks}</strong>
                })}
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t("alerts.orderConflictWarning.detail")}
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
              {t("alerts.orderConflictWarning.continue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
