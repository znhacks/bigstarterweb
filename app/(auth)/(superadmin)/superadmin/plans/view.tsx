// app/admin/plans/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Edit, ShieldAlert, Check, X, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { FEATURE_DEFINITIONS, FeatureDefinition } from "@/config/feature-definitions";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

interface DBPlan {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  display_features: string[];
  features: string[];
}

interface DBPrice {
  plan_id: string;
  interval: "monthly" | "yearly";
  amount: number;
  provider_ids: Record<string, string>;
}

const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
  isActive: true,
  displayFeaturesRaw: "",
  monthlyAmount: 0,
  yearlyAmount: 0,
  monthlyProviders: {
    stripe: "",
    paypal: "",
    paddle: "",
    lemonsqueezy: "",
    midtrans: "",
    xendit: "",
    mayar: "",
    braintree: ""
  },
  yearlyProviders: {
    stripe: "",
    paypal: "",
    paddle: "",
    lemonsqueezy: "",
    midtrans: "",
    xendit: "",
    mayar: "",
    braintree: ""
  }
};

export function AdminPlansPage() {
  const [plans, setPlans] = useState<DBPlan[]>([]);
  const [prices, setPrices] = useState<DBPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // State Dinamis untuk Feature Gates (RBAC) berdasarkan FEATURE_DEFINITIONS
  const [formGates, setFormGates] = useState<Record<string, any>>({});

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized: Silakan masuk.");

      const response = await fetch("/api/admin/plans", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengambil data");

      setPlans(data.plans || []);
      setPrices(data.prices || []);
    } catch (err: any) {
      setErrorErrorMsg(err.message || "Gagal memuat data superadmin.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Handler saat tombol Tambah Paket Baru ditekan
  const handleOpenCreate = () => {
    setIsEditMode(false);
    setForm({ ...EMPTY_FORM });

    // Inisialisasi gerbang fitur dengan nilai default dari skema
    const defaultGates: Record<string, any> = {};
    FEATURE_DEFINITIONS.forEach((def) => {
      defaultGates[def.key] = def.defaultValue;
    });
    setFormGates(defaultGates);
    setDialogOpen(true);
  };

  // Handler saat tombol Edit Paket ditekan
  const handleOpenEdit = (plan: DBPlan) => {
    setIsEditMode(true);
    const mPrice = prices.find((p) => p.plan_id === plan.id && p.interval === "monthly");
    const yPrice = prices.find((p) => p.plan_id === plan.id && p.interval === "yearly");

    setForm({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      isActive: plan.is_active,
      displayFeaturesRaw: plan.display_features.join("\n"),
      monthlyAmount: mPrice ? mPrice.amount : 0,
      yearlyAmount: yPrice ? yPrice.amount : 0,
      monthlyProviders: {
        stripe: mPrice?.provider_ids?.stripe || "",
        paypal: mPrice?.provider_ids?.paypal || "",
        paddle: mPrice?.provider_ids?.paddle || "",
        lemonsqueezy: mPrice?.provider_ids?.lemonsqueezy || "",
        midtrans: mPrice?.provider_ids?.midtrans || "",
        xendit: mPrice?.provider_ids?.xendit || "",
        mayar: mPrice?.provider_ids?.mayar || "",
        braintree: mPrice?.provider_ids?.braintree || ""
      },
      yearlyProviders: {
        stripe: yPrice?.provider_ids?.stripe || "",
        paypal: yPrice?.provider_ids?.paypal || "",
        paddle: yPrice?.provider_ids?.paddle || "",
        lemonsqueezy: yPrice?.provider_ids?.lemonsqueezy || "",
        midtrans: yPrice?.provider_ids?.midtrans || "",
        xendit: yPrice?.provider_ids?.xendit || "",
        mayar: yPrice?.provider_ids?.mayar || "",
        braintree: yPrice?.provider_ids?.braintree || ""
      }
    });

    // DEKOMPILASI: Menerjemahkan array ['allowPdfFormat', 'limit:maxTasks:2000']
    // dari database menjadi state form React secara otomatis
    const activeGates: Record<string, any> = {};
    FEATURE_DEFINITIONS.forEach((def) => {
      if (def.type === "boolean") {
        activeGates[def.key] = plan.features.includes(def.key);
      } else {
        const prefix = `limit:${def.key}:`;
        const match = plan.features.find((item) => item.startsWith(prefix));
        activeGates[def.key] = match ? parseInt(match.split(":")[2]) : def.defaultValue;
      }
    });
    setFormGates(activeGates);
    setDialogOpen(true);
  };

  const handleSavePlan = async () => {
    setIsSaving(true);
    setErrorErrorMsg(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      // KOMPILASI BARU (SOLUSI ARRAY): Menerjemahkan input UI menjadi array database ['key', 'limit:key:value']
      const compiledFeatures: string[] = [];
      FEATURE_DEFINITIONS.forEach((def) => {
        const value = formGates[def.key];
        if (def.type === "boolean") {
          if (value === true) compiledFeatures.push(def.key);
        } else {
          compiledFeatures.push(`limit:${def.key}:${value || 0}`);
        }
      });

      const payload = {
        id: form.id,
        name: form.name,
        description: form.description,
        isActive: form.isActive,
        displayFeatures: form.displayFeaturesRaw
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
        features: compiledFeatures, // Menyimpan array rbac terkompilasi
        prices: {
          monthly: {
            amount: form.monthlyAmount,
            providerIds: form.monthlyProviders
          },
          yearly: {
            amount: form.yearlyAmount,
            providerIds: form.yearlyProviders
          }
        }
      };

      const response = await fetch("/api/admin/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Gagal menyimpan");

      setSuccessMsg("Sukses menyimpan paket penagihan!");
      setDialogOpen(false);
      fetchAdminData();
    } catch (err: any) {
      setErrorErrorMsg(err.message || "Gagal menyimpan paket.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menonaktifkan paket ini?")) return;
    setErrorErrorMsg(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const response = await fetch(`/api/admin/plans?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Gagal menghapus");

      setSuccessMsg("Sukses menonaktifkan paket!");
      fetchAdminData();
    } catch (err: any) {
      setErrorErrorMsg(err.message || "Gagal menghapus paket.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Manajemen Paket
          </h1>
          <p className="text-sm text-slate-500">
            Buat, ubah, atau hapus skema harga paket secara dinamis.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-slate-950 text-white hover:bg-slate-800">
          <Plus className="me-1.5 h-4 w-4" /> Tambah Paket
        </Button>
      </div>

      {successMsg && (
        <Alert className="border-emerald-500/30 bg-emerald-50 text-emerald-700">
          <Check className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Sukses</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Sistem Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">ID / Nama Paket</th>
                  <th className="px-6 py-4">Harga Bulanan (Monthly)</th>
                  <th className="px-6 py-4">Harga Tahunan (Yearly)</th>
                  <th className="px-6 py-4">Status RLS</th>
                  <th className="px-6 py-4 text-end">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Belum ada paket yang terdaftar di database.
                    </td>
                  </tr>
                ) : (
                  plans.map((p) => {
                    const mPrice = prices.find(
                      (pr) => pr.plan_id === p.id && pr.interval === "monthly"
                    );
                    const yPrice = prices.find(
                      (pr) => pr.plan_id === p.id && pr.interval === "yearly"
                    );

                    return (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="font-mono text-xs text-slate-400">{p.id}</p>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {mPrice
                            ? `Rp ${parseFloat(mPrice.amount.toString()).toLocaleString("id-ID")}`
                            : "Rp 0"}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {yPrice
                            ? `Rp ${parseFloat(yPrice.amount.toString()).toLocaleString("id-ID")}`
                            : "Rp 0"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={p.is_active ? "default" : "secondary"}
                            className={
                              p.is_active
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10"
                                : ""
                            }>
                            {p.is_active ? "ACTIVE" : "INACTIVE"}
                          </Badge>
                        </td>
                        <td className="space-x-2 px-6 py-4 text-end whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(p)}
                            className="border-slate-200">
                            <Edit className="me-1 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePlan(p.id)}
                            disabled={!p.is_active}
                            className="text-red-500 hover:bg-red-50 hover:text-red-700">
                            Nonaktifkan
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DIALOG FORM: CREATE / EDIT PLAN */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-[700px] overflow-y-auto rounded-2xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isEditMode ? "Edit Paket Penagihan" : "Tambah Paket Baru"}
            </DialogTitle>
            <DialogDescription>
              Isi detail paket, batasan fitur (RBAC), dan pemetaan ID Gateway secara lengkap.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 1. INFORMASI DASAR */}
            <div className="space-y-4 border-b border-slate-100 pb-4">
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                1. Informasi Dasar
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-id">ID Paket (Sistem Key)</Label>
                  <Input
                    id="plan-id"
                    disabled={isEditMode}
                    value={form.id}
                    onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                    placeholder="contoh: starter, pro, enterprise"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-name">Nama Paket (Tampilan UI)</Label>
                  <Input
                    id="plan-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="contoh: Pro Plan"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-desc">Deskripsi Paket</Label>
                <Input
                  id="plan-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Penjelasan singkat keunggulan paket"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-display">
                  Fitur Pemasaran (Tabel Pricing UI) - Satu Fitur Per Baris Baru
                </Label>
                <textarea
                  id="plan-display"
                  rows={3}
                  value={form.displayFeaturesRaw}
                  onChange={(e) => setForm((f) => ({ ...f, displayFeaturesRaw: e.target.value }))}
                  placeholder="contoh:&#10;10.000 Tasks per bulan&#10;Dukungan Prioritas"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* 2. DYNAMIC FEATURE GATING (Sistem membaca config/feature-definitions.ts) */}
            <div className="space-y-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  2. Konfigurasi Fitur & Batasan (RBAC Array)
                </h3>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  <Info className="me-0.5 h-3 w-3" /> Dinamis
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FEATURE_DEFINITIONS.map((def: FeatureDefinition) => {
                  return (
                    <div
                      key={def.key}
                      className="flex flex-col justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-slate-900">{def.label}</Label>
                        <p className="text-[10px] leading-normal text-slate-400">
                          {def.description}
                        </p>
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
                            <span className="text-xs font-medium text-slate-500">
                              {formGates[def.key] ? "AKTIF" : "NON-AKTIF"}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              size={30}
                              value={formGates[def.key] || 0}
                              onChange={(e) =>
                                setFormGates((prev) => ({
                                  ...prev,
                                  [def.key]: parseInt(e.target.value) || 0
                                }))
                              }
                              className="h-8 max-w-[120px] text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. PEMETAAN HARGA & ID GATEWAY */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                3. Penagihan & ID Gateway (Stripe, PayPal, dll)
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* BLOK BULANAN */}
                <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/20 p-4">
                  <div className="space-y-1">
                    <Label htmlFor="m-amount" className="text-sm font-bold text-slate-900">
                      Siklus Bulanan (Monthly)
                    </Label>
                    <Input
                      id="m-amount"
                      type="number"
                      value={form.monthlyAmount}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, monthlyAmount: parseFloat(e.target.value) || 0 }))
                      }
                      placeholder="Harga dasar IDR"
                    />
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                      ID Gateway Bulanan
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Stripe Price ID</Label>
                        <Input
                          value={form.monthlyProviders.stripe}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              monthlyProviders: { ...f.monthlyProviders, stripe: e.target.value }
                            }))
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">PayPal Plan ID</Label>
                        <Input
                          value={form.monthlyProviders.paypal}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              monthlyProviders: { ...f.monthlyProviders, paypal: e.target.value }
                            }))
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Paddle Price ID</Label>
                        <Input
                          value={form.monthlyProviders.paddle}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              monthlyProviders: { ...f.monthlyProviders, paddle: e.target.value }
                            }))
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Lemon Variant ID</Label>
                        <Input
                          value={form.monthlyProviders.lemonsqueezy}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              monthlyProviders: {
                                ...f.monthlyProviders,
                                lemonsqueezy: e.target.value
                              }
                            }))
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOK TAHUNAN */}
                <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/20 p-4">
                  <div className="space-y-1">
                    <Label htmlFor="y-amount" className="text-sm font-bold text-slate-900">
                      Siklus Tahunan (Yearly)
                    </Label>
                    <Input
                      id="y-amount"
                      type="number"
                      value={form.yearlyAmount}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, yearlyAmount: parseFloat(e.target.value) || 0 }))
                      }
                      placeholder="Harga dasar IDR"
                    />
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                      ID Gateway Tahunan
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Stripe Price ID</Label>
                        <Input
                          value={form.yearlyProviders.stripe}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              yearlyProviders: { ...f.yearlyProviders, stripe: e.target.value }
                            }))
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">PayPal Plan ID</Label>
                        <Input
                          value={form.yearlyProviders.paypal}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              yearlyProviders: { ...f.yearlyProviders, paypal: e.target.value }
                            }))
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Paddle Price ID</Label>
                        <Input
                          value={form.yearlyProviders.paddle}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              yearlyProviders: { ...f.yearlyProviders, paddle: e.target.value }
                            }))
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Lemon Variant ID</Label>
                        <Input
                          value={form.yearlyProviders.lemonsqueezy}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              yearlyProviders: {
                                ...f.yearlyProviders,
                                lemonsqueezy: e.target.value
                              }
                            }))
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Kembali
            </Button>
            <Button
              onClick={handleSavePlan}
              disabled={isSaving}
              className="bg-slate-950 text-white hover:bg-slate-800">
              {isSaving && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />} Simpan Paket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
