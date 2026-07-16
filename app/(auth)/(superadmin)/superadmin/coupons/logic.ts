// app/(auth)/(superadmin)/superadmin/coupons/logic.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/i18n/currency";

export interface DBCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  valid_until: string | null;
  max_redemptions: number | null;
  redeemed_count: number;
  created_at: string;
}

export const EMPTY_COUPON_FORM = {
  code: "",
  discountType: "percentage" as "percentage" | "fixed_amount",
  discountValue: 0,
  validUntil: "",
  maxRedemptions: ""
};

export const getExpiryStatus = (c: DBCoupon): "expired" | "active" | "no_expiry" => {
  if (!c.valid_until) return "no_expiry";
  return new Date() > new Date(c.valid_until) ? "expired" : "active";
};

export function useAdminCoupons() {
  const t = useTranslations("superadmin.coupons");
  const locale = useLocale();

  const [coupons, setCoupons] = useState<DBCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_COUPON_FORM });

  const [deleteTarget, setDeleteTarget] = useState<DBCoupon | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const showAlert = (type: "success" | "error", msg: string) => {
    if (type === "success") setSuccessMsg(msg);
    else setErrorMsg(msg);
  };

  useEffect(() => {
    if (!successMsg && !errorMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [successMsg, errorMsg]);

  const fetchAdminCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const response = await fetch("/api/admin/coupons", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("alerts.error"));
      setCoupons(data.coupons || []);
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAdminCoupons();
  }, [fetchAdminCoupons]);

  const formatDiscount = useCallback(
    (c: DBCoupon) =>
      c.discount_type === "percentage"
        ? `${parseFloat(String(c.discount_value))}%`
        : formatCurrency(parseFloat(String(c.discount_value)), locale, { currencyCode: "IDR" }),
    [locale]
  );

  const handleBulkDelete = async (selectedRows: DBCoupon[], onResetSelection: () => void) => {
    if (selectedRows.length === 0) return;

    setIsBulkDeleting(true);
    setErrorMsg(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const results = await Promise.all(
        selectedRows.map((c) =>
          fetch(`/api/admin/coupons?id=${c.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.access_token}` }
          }).then((r) => r.json().then((data) => ({ ok: r.ok && !data.error })))
        )
      );
      const failedCount = results.filter((r) => !r.ok).length;

      if (failedCount > 0) {
        showAlert(
          "error",
          `${selectedRows.length - failedCount} berhasil dihapus, ${failedCount} gagal.`
        );
      } else {
        showAlert("success", `${selectedRows.length} kupon berhasil dihapus.`);
      }

      onResetSelection();
      fetchAdminCoupons();
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setIsBulkDeleting(false);
      setBulkConfirmOpen(false);
    }
  };

  const handleOpenCreate = () => {
    setForm({ ...EMPTY_COUPON_FORM });
    setDialogOpen(true);
  };

  const handleSaveCoupon = async () => {
    if (!form.code || !form.discountType || form.discountValue === undefined) {
      showAlert("error", t("alerts.required"));
      return;
    }
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
          code: form.code,
          discountType: form.discountType,
          discountValue: form.discountValue,
          validUntil: form.validUntil || null,
          maxRedemptions: form.maxRedemptions ? parseInt(form.maxRedemptions) : null
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || t("alerts.error"));

      showAlert("success", t("alerts.createSuccess"));
      setDialogOpen(false);
      fetchAdminCoupons();
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const response = await fetch(`/api/admin/coupons?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || t("alerts.error"));

      showAlert("success", t("alerts.deleteSuccess", { code: deleteTarget.code }));
      fetchAdminCoupons();
    } catch (err: any) {
      setErrorMsg(err.message || t("alerts.error"));
    } finally {
      setDeleteTarget(null);
    }
  };

  return {
    t,
    locale,
    coupons,
    isLoading,
    isSaving,
    errorMsg,
    successMsg,
    dialogOpen,
    setDialogOpen,
    form,
    setForm,
    deleteTarget,
    setDeleteTarget,
    bulkConfirmOpen,
    setBulkConfirmOpen,
    isBulkDeleting,
    formatDiscount,
    handleBulkDelete,
    handleOpenCreate,
    handleSaveCoupon,
    confirmDelete
  };
}
