// app/admin/coupons/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2, ShieldAlert, Check, Ticket, Calendar, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress"; // IMPOR BARU: Shadcn UI Progress Bar
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
// IMPOR BARU: Shadcn UI Table Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";

interface DBCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  valid_until: string | null;
  max_redemptions: number | null;
  redeemed_count: number;
  created_at: string;
}

const EMPTY_COUPON_FORM = {
  code: "",
  discountType: "percentage" as "percentage" | "fixed_amount",
  discountValue: 0,
  validUntil: "",
  maxRedemptions: ""
};

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<DBCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_COUPON_FORM });

  const fetchAdminCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized: Silakan masuk.");

      const response = await fetch("/api/admin/coupons", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengambil data kupon");

      setCoupons(data.coupons || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat data superadmin kupon.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminCoupons();
  }, [fetchAdminCoupons]);

  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  const handleOpenCreate = () => {
    setForm({ ...EMPTY_COUPON_FORM });
    setDialogOpen(true);
  };

  const handleSaveCoupon = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          code: form.code, // Menyimpan kode apa adanya (UTF-8 ramah simbol & bahasa internasional)
          discountType: form.discountType,
          discountValue: form.discountValue,
          validUntil: form.validUntil || null,
          maxRedemptions: form.maxRedemptions ? parseInt(form.maxRedemptions) : null
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Gagal menyimpan kupon");

      setSuccessMsg("Sukses membuat kupon promosi baru!");
      setDialogOpen(false);
      fetchAdminCoupons();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan kupon.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus permanen kupon "${code}"?`)) return;
    setErrorMsg(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const response = await fetch(`/api/admin/coupons?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Gagal menghapus kupon");

      setSuccessMsg(`Kupon "${code}" berhasil dihapus.`);
      fetchAdminCoupons();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus kupon.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Manajemen Kupon & Diskon
          </h1>
          <p className="text-sm text-slate-500">
            Kelola kupon promosi, diskon persentase, flat rupiah, dan kuota penukaran secara
            dinamis.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-slate-950 text-white hover:bg-slate-800">
          <Plus className="me-1.5 h-4 w-4" /> Tambah Kupon
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
        <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-0">
            {/* IMPLEMENTASI SHADCN UI TABLE */}
            <Table className="min-w-[800px]">
              <TableHeader className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                <TableRow>
                  <TableHead className="px-6 py-4 text-slate-500">Kode Kupon</TableHead>
                  <TableHead className="px-6 py-4 text-slate-500">Besaran Diskon</TableHead>
                  <TableHead className="px-6 py-4 text-slate-500">Batas Kedaluwarsa</TableHead>
                  <TableHead className="px-6 py-4 text-slate-500">Kuota Penukaran</TableHead>
                  <TableHead className="px-6 py-4 text-end text-slate-500">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 text-slate-800">
                {coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-slate-400">
                      Belum ada kupon promosi aktif di database.
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((c) => {
                    const isExpired = c.valid_until ? new Date() > new Date(c.valid_until) : false;
                    const progressPercent = c.max_redemptions
                      ? Math.min(100, (c.redeemed_count / c.max_redemptions) * 100)
                      : 0;

                    return (
                      <TableRow key={c.id} className="transition-colors hover:bg-slate-50/50">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-slate-400" />
                            <span className="font-mono font-bold tracking-wider text-slate-900">
                              {c.code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 font-semibold text-slate-900">
                          {c.discount_type === "percentage"
                            ? `${parseFloat(c.discount_value.toString())}%`
                            : `Rp ${parseFloat(c.discount_value.toString()).toLocaleString("id-ID")}`}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {c.valid_until ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span
                                className={
                                  isExpired ? "font-semibold text-red-500" : "text-slate-600"
                                }>
                                {/* MENAMPILKAN TANGGAL BESERTA JAM & MENIT AKURAT */}
                                {new Date(c.valid_until).toLocaleString("id-ID", {
                                  dateStyle: "medium",
                                  timeStyle: "short"
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">— Unlimited Time —</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" /> {c.redeemed_count} terpakai
                              </span>
                              <span>
                                {c.max_redemptions ? `${c.max_redemptions} batas` : "Unlimited"}
                              </span>
                            </div>
                            {c.max_redemptions && (
                              /* IMPLEMENTASI SHADCN UI PROGRESS BAR */
                              <Progress
                                value={progressPercent}
                                className="h-1.5 w-full bg-slate-100"
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCoupon(c.id, c.code)}
                            className="text-red-500 hover:bg-red-50 hover:text-red-700">
                            <Trash2 className="me-1 h-4 w-4" /> Hapus
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* DIALOG FORM: CREATE COUPON */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[450px] rounded-2xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Buat Kupon Promosi Baru</DialogTitle>
            <DialogDescription>
              Miliki kontrol penuh atas diskon, tipe persentase/flat rupiah, kuota batas, dan masa
              berlaku.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="coupon-code">Kode Kupon</Label>
              {/* DIUBAH: Menghapus .toUpperCase() paksa agar ramah simbol, Arab, Kanji, dan mixed-casing */}
              <Input
                id="coupon-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Contoh: DISKON_20%, 割引_50, atau خصم_١٠"
                className="font-mono tracking-wider"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipe Potongan</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v: any) => setForm((f) => ({ ...f, discountType: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Persentase (%)</SelectItem>
                    <SelectItem value="fixed_amount">Rupiah Flat (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="discount-value">Nilai Potongan</Label>
                <Input
                  id="discount-value"
                  type="number"
                  value={form.discountValue || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountValue: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder={form.discountType === "percentage" ? "Contoh: 20" : "Contoh: 50000"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="max-redemptions">Kuota Penggunaan</Label>
                <Input
                  id="max-redemptions"
                  type="number"
                  value={form.maxRedemptions}
                  onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                  placeholder="Kosongkan jika unlimted"
                />
              </div>

              <div className="space-y-1.5">
                {/* DIUBAH: Menggunakan datetime-local agar mendukung pemilihan Jam & Menit secara presisi */}
                <Label htmlFor="valid-until">Batas Kedaluwarsa (Tanggal & Waktu)</Label>
                <Input
                  id="valid-until"
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Batal
            </Button>
            <Button
              onClick={handleSaveCoupon}
              disabled={isSaving}
              className="bg-slate-950 text-white hover:bg-slate-800">
              {isSaving && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />} Buat Kupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
