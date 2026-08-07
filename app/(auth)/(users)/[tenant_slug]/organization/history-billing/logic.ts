// app/(auth)/(users)/[tenant_slug]/organization/billing/history/logic.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { transactionRepository } from "@/supabase/repositories/transactions";

export interface Transaction {
  id: string;
  tenant_id: string;
  amount: number;
  currency?: string | null;
  amount_in_idr?: number | null;
  plan_name: string;
  order_id: string;
  status: string;
  created_at: string;
  provider?: string;
}

export function useBillingHistory() {
  const locale = useLocale();
  const t = useTranslations("organization.organization-billing");
  const tBilling = useTranslations("billing");
  const params = useParams();
  const tenantSlug = (params as any)?.tenant_slug as string | undefined;

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const fetchTransactionHistory = useCallback(async (orgId: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await (await transactionRepository(supabase))
        .query()
        .select("*")
        .eq("tenant_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (e: any) {
      console.error("Gagal memuat riwayat transaksi:", e);
      setLoadError(e?.message || "Gagal memuat riwayat transaksi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function resolveAndLoad() {
      setIsLoading(true);
      let targetId = localStorage.getItem("active_org_id");

      if (tenantSlug) {
        const { data: tData } = await supabase
          .from("tenants")
          .select("id")
          .ilike("slug", tenantSlug)
          .maybeSingle();

        if (tData?.id) {
          targetId = tData.id;
          localStorage.setItem("active_org_id", tData.id);
          document.cookie = `active_tenant_id=${tData.id}; path=/; max-age=2592000; SameSite=Lax;`;
        }
      }

      if (targetId) {
        setActiveOrgId(targetId);
        fetchTransactionHistory(targetId);
      } else {
        setIsLoading(false);
      }
    }
    resolveAndLoad();
  }, [tenantSlug, fetchTransactionHistory]);

  return {
    locale,
    t,
    tBilling,
    activeOrgId,
    transactions,
    isLoading,
    loadError,
    selectedInvoice,
    setSelectedInvoice,
    isInvoiceOpen,
    setIsInvoiceOpen,
    refetch: () => activeOrgId && fetchTransactionHistory(activeOrgId)
  };
}
