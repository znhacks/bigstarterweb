"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { planRepository } from "@/supabase/repositories/plans";
import { planPriceRepository } from "@/supabase/repositories/plan-pices";
import { transactionRepository } from "@/supabase/repositories/transactions";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { useLocale } from "next-intl";
import type { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, subDays } from "date-fns";

export function useSuperadminBilling() {
  const locale = useLocale();

  // State Data Master
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [planPrices, setPlanPrices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Tanggal Terintegrasi
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 27)),
    to: endOfDay(new Date())
  });

  const [revenueChartInterval, setRevenueChartInterval] = useState<"day" | "month" | "year">("day");

  useEffect(() => {
    loadAllDashboardData();
  }, []);

  const loadAllDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: plansData } = await (await planRepository(supabase)).query().select("*");
      const { data: pricesData } = await (await planPriceRepository(supabase))
        .query()
        .select("*");
      setPlans(plansData || []);
      setPlanPrices(pricesData || []);

      const { data: txsData, error: txsError } = await (await transactionRepository(supabase))
        .query()
        .select("*, tenants(name)")
        .order("created_at", { ascending: false });
      if (txsError) throw txsError;
      setTransactions(txsData || []);

      const { data: subsData, error: subsError } = await (await subscriptionRepository(supabase))
        .query()
        .select("*, tenants(name)");
      if (subsError) throw subsError;
      setSubscriptions(subsData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGIK FILTER DATA ---
  const filteredData = useMemo(() => {
    const txs = transactions.filter((tx) => {
      const txDate = new Date(tx.created_at);
      let matchDate = true;

      if (date?.from) {
        const start = startOfDay(date.from);
        const end = endOfDay(date.to ?? date.from);
        matchDate = txDate >= start && txDate <= end;
      }

      return matchDate;
    });

    return { txs, subs: subscriptions };
  }, [transactions, subscriptions, date]);

  // Metrik KPI Esensial
  const metrics = useMemo(() => {
    const txs = filteredData.txs;
    const subs = filteredData.subs;
    const PAID_STATUSES = ["paid", "completed"];

    const totalRev = txs
      .filter((tx) => PAID_STATUSES.includes(tx.status?.toLowerCase()) && tx.amount_in_idr != null)
      .reduce((sum, tx) => sum + Number(tx.amount_in_idr || 0), 0);

    const activeSubs = subs.filter((sub) => sub.status === "active");

    let calculatedMRR = 0;
    activeSubs.forEach((sub) => {
      const priceMeta = planPrices.find(
        (p) => p.plan_id === sub.plan_id && p.interval === (sub.interval || "month")
      );
      const amount = priceMeta ? Number(priceMeta.amount) : 0;
      const rate = 15000;
      const valInIdr = sub.interval === "year" ? (amount * rate) / 12 : amount * rate;
      calculatedMRR +=
        sub.interval === "year" || sub.interval === "yearly" ? valInIdr / 12 : valInIdr;
    });

    const canceledSubsCount = subs.filter((sub) => sub.status === "canceled").length;
    const failedPaymentsCount = txs.filter((tx) => tx.status === "failed").length;

    return {
      totalRev,
      mrr: calculatedMRR,
      activeSubsCount: activeSubs.length,
      canceledSubsCount,
      failedPaymentsCount
    };
  }, [filteredData, planPrices]);

  const revenueChartData = useMemo(() => {
    const txs = filteredData.txs.filter((tx) =>
      ["paid", "completed"].includes(tx.status?.toLowerCase())
    );
    const groups: { [key: string]: number } = {};

    txs.forEach((tx) => {
      const dateVal = new Date(tx.created_at);
      let key = "";
      if (revenueChartInterval === "day") {
        key = dateVal.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
          month: "short",
          day: "numeric"
        });
      } else if (revenueChartInterval === "month") {
        key = dateVal.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
          year: "2-digit",
          month: "short"
        });
      } else {
        key = dateVal.getFullYear().toString();
      }
      groups[key] = (groups[key] || 0) + Number(tx.amount_in_idr || 0);
    });

    return Object.entries(groups).map(([name, value]) => ({ name, Pendapatan: value }));
  }, [filteredData.txs, revenueChartInterval, locale]);

  const subscriptionAnalyticsData = useMemo(() => {
    const groups: { [key: string]: any } = {};
    filteredData.subs.forEach((sub) => {
      const dateVal = new Date(sub.starts_at || sub.updated_at);
      const key = dateVal.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
        month: "short",
        day: "numeric"
      });

      if (!groups[key]) {
        groups[key] = {
          name: key,
          Baru: 0,
          Perpanjangan: 0,
          Upgrade: 0,
          Downgrade: 0,
          Pembatalan: 0
        };
      }
      if (sub.status === "active") groups[key].Baru += 1;
      else if (sub.status === "canceled") groups[key].Pembatalan += 1;
      else groups[key].Perpanjangan += 1;
    });

    return Object.values(groups).slice(-10);
  }, [filteredData.subs, locale]);

  const paymentAnalyticsData = useMemo(() => {
    const gateways: { [key: string]: number } = {};
    filteredData.txs.forEach((tx) => {
      const provider = tx.provider || "Unknown";
      gateways[provider] = (gateways[provider] || 0) + 1;
    });
    return Object.entries(gateways).map(([name, value]) => ({ name, value }));
  }, [filteredData.txs]);

  const revenueByPlanData = useMemo(() => {
    const plansCount: { [key: string]: number } = {};
    filteredData.subs.forEach((sub) => {
      const planName = sub.plan_id || "Free";
      plansCount[planName] = (plansCount[planName] || 0) + 1;
    });
    return Object.entries(plansCount).map(([name, users]) => ({ name, Pengguna: users }));
  }, [filteredData.subs]);

  const subscriptionStatusData = useMemo(() => {
    const statusGroup: { [key: string]: number } = {};
    filteredData.subs.forEach((sub) => {
      const status = sub.status || "Unknown";
      statusGroup[status] = (statusGroup[status] || 0) + 1;
    });
    return Object.entries(statusGroup).map(([name, value]) => ({ name, value }));
  }, [filteredData.subs]);

  const topCustomers = useMemo(() => {
    const customerMap: { [key: string]: { name: string; totalPaid: number; plan: string } } = {};
    filteredData.txs.forEach((tx) => {
      if (["paid", "completed"].includes(tx.status?.toLowerCase())) {
        const tId = tx.tenant_id;
        const tenantName = tx.tenants?.name || "Unknown Tenant";
        const current = customerMap[tId] || { name: tenantName, totalPaid: 0, plan: tx.plan_name };
        current.totalPaid += Number(tx.amount_in_idr || 0);
        customerMap[tId] = current;
      }
    });
    return Object.values(customerMap)
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 5);
  }, [filteredData.txs]);

  const topPlans = useMemo(() => {
    const planMap: { [key: string]: { subscribers: number; revenue: number } } = {};
    filteredData.subs.forEach((sub) => {
      const pId = sub.plan_id || "Free";
      const current = planMap[pId] || { subscribers: 0, revenue: 0 };
      current.subscribers += 1;
      planMap[pId] = current;
    });
    filteredData.txs.forEach((tx) => {
      if (["paid", "completed"].includes(tx.status?.toLowerCase())) {
        const pName = tx.plan_name || "Free";
        const current = planMap[pName] || { subscribers: 0, revenue: 0 };
        current.revenue += Number(tx.amount_in_idr || 0);
        planMap[pName] = current;
      }
    });
    return Object.entries(planMap).map(([plan, data]) => ({ plan, ...data }));
  }, [filteredData.subs, filteredData.txs]);

  return {
    locale,
    isLoading,
    date,
    setDate,
    revenueChartInterval,
    setRevenueChartInterval,
    plans,
    filteredData,
    metrics,
    revenueChartData,
    subscriptionAnalyticsData,
    paymentAnalyticsData,
    revenueByPlanData,
    subscriptionStatusData,
    topCustomers,
    topPlans,
    loadAllDashboardData
  };
}
