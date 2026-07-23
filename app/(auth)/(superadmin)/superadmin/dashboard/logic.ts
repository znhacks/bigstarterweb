"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { profileRepository } from "@/supabase/repositories/profiles";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { planRepository } from "@/supabase/repositories/plans";
import { transactionRepository } from "@/supabase/repositories/transactions";
import { couponRepository } from "@/supabase/repositories/coupons";
import { useLocale } from "next-intl";
import {
  startOfDay,
  endOfDay,
  subDays,
  differenceInDays,
  formatDistanceToNow,
  isToday,
  isAfter,
  isBefore
} from "date-fns";
import { id, enUS } from "date-fns/locale";

export function useSuperadminMainDashboard() {
  const locale = useLocale();

  // State Data Master dari Tabel Database
  const [profiles, setProfiles] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Filter Tanggal Terintegrasi & Rentang Grafik Pendapatan ("7d" | "30d" | "12m")
  const [revenueFilter, setRevenueFilter] = useState<"7d" | "30d" | "12m">("30d");
  const [date, setDate] = useState<{ from: Date; to: Date }>({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date())
  });

  const loadAllDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Ambil data paralel dari seluruh tabel target berdasarkan skema database
      const [profilesRes, tenantsRes, subscriptionsRes, plansRes, transactionsRes, couponsRes] =
        await Promise.all([
          (await profileRepository(supabase))
            .query()
            .select("id, created_at, deleted_at, status")
            .order("created_at", { ascending: false }),
          (await tenantRepository(supabase))
            .query()
            .select("*")
            .order("created_at", { ascending: false }),
          (await subscriptionRepository(supabase))
            .query()
            .select("*, tenants(name)")
            .order("updated_at", { ascending: false }),
          (await planRepository(supabase)).query().select("*, plan_prices(*)"),
          (await transactionRepository(supabase))
            .query()
            .select("*, tenants(name)")
            .order("created_at", { ascending: false }),
          (await couponRepository(supabase))
            .query()
            .select("*")
            .order("created_at", { ascending: false })
        ]);

      setProfiles(profilesRes.data || []);
      setTenants(tenantsRes.data || []);
      setSubscriptions(subscriptionsRes.data || []);
      setPlans(plansRes.data || []);
      setTransactions(transactionsRes.data || []);
      setCoupons(couponsRes.data || []);
    } catch (error) {
      console.error("Gagal memuat data dashboard utama superadmin:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllDashboardData();
  }, [loadAllDashboardData]);

  // Helper Lokalisasi Waktu Relatif
  const getRelativeTime = useCallback(
    (dateStr: string) => {
      try {
        return formatDistanceToNow(new Date(dateStr), {
          addSuffix: true,
          locale: locale === "id" ? id : enUS
        });
      } catch (e) {
        return dateStr;
      }
    },
    [locale]
  );

  // ==========================================
  // 1. KPI CARDS (8 CARDS METRICS)
  // ==========================================
  const metrics = useMemo(() => {
    const activeTenants = tenants.filter((t) => !t.deleted_at).length;
    const activeSubs = subscriptions.filter((s) => s.status === "active").length;

    // Total Revenue (menggunakan net_amount, fallback ke amount_in_idr atau amount)
    const grossRevenue = transactions
      .filter((tx) =>
        ["paid", "completed", "success", "settlement", "capture"].includes(tx.status?.toLowerCase())
      )
      .reduce((sum, tx) => sum + Number(tx.net_amount || tx.amount_in_idr || tx.amount || 0), 0);

    const totalUsers = profiles.filter((p) => !p.deleted_at).length;
    const totalTransactions = transactions.length;
    const activePlans = plans.filter((p) => p.is_active === true).length;

    // Active Coupons: valid_until > now
    const now = new Date();
    const activeCoupons = coupons.filter((c) => {
      if (!c.valid_until) return true;
      return isAfter(new Date(c.valid_until), now);
    }).length;

    // Hitung persentase pertumbuhan pengguna baru 30 hari terakhir dibandingkan 30 hari sebelumnya
    const startOfCurrentPeriod = subDays(now, 30);
    const startOfPreviousPeriod = subDays(now, 60);

    const currentPeriodUsers = profiles.filter(
      (p) => isAfter(new Date(p.created_at), startOfCurrentPeriod) && !p.deleted_at
    ).length;

    const previousPeriodUsers = profiles.filter(
      (p) =>
        isAfter(new Date(p.created_at), startOfPreviousPeriod) &&
        isBefore(new Date(p.created_at), startOfCurrentPeriod) &&
        !p.deleted_at
    ).length;

    let growthPercentage = 0;
    if (previousPeriodUsers > 0) {
      growthPercentage = Math.round(
        ((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers) * 100
      );
    } else if (currentPeriodUsers > 0) {
      growthPercentage = 100;
    }

    return {
      totalTenants: activeTenants,
      activeSubs,
      totalRevenue: grossRevenue,
      totalUsers,
      totalTransactions,
      activePlans,
      activeCoupons,
      growth: growthPercentage >= 0 ? `+${growthPercentage}%` : `${growthPercentage}%`
    };
  }, [tenants, subscriptions, transactions, profiles, plans, coupons]);

  // ==========================================
  // 2. REVENUE CHART (7 Days, 30 Days, 12 Months)
  // ==========================================
  const revenueChartData = useMemo(() => {
    const groups: { [key: string]: number } = {};
    const paidTxs = transactions.filter((tx) =>
      ["paid", "completed", "success", "settlement", "capture"].includes(tx.status?.toLowerCase())
    );

    const now = new Date();

    if (revenueFilter === "7d") {
      // Setup default 7 hari terakhir
      for (let i = 6; i >= 0; i--) {
        const d = subDays(now, i);
        const dayLabel = d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
          weekday: "short"
        });
        groups[dayLabel] = 0;
      }
      paidTxs.forEach((tx) => {
        const txDate = new Date(tx.created_at);
        if (differenceInDays(now, txDate) < 7) {
          const dayLabel = txDate.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
            weekday: "short"
          });
          groups[dayLabel] =
            (groups[dayLabel] || 0) + Number(tx.net_amount || tx.amount_in_idr || tx.amount || 0);
        }
      });
    } else if (revenueFilter === "30d") {
      // Setup default 30 hari terakhir
      for (let i = 29; i >= 0; i--) {
        const d = subDays(now, i);
        const dateLabel = d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
          month: "short",
          day: "numeric"
        });
        groups[dateLabel] = 0;
      }
      paidTxs.forEach((tx) => {
        const txDate = new Date(tx.created_at);
        if (differenceInDays(now, txDate) < 30) {
          const dateLabel = txDate.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
            month: "short",
            day: "numeric"
          });
          groups[dateLabel] =
            (groups[dateLabel] || 0) + Number(tx.net_amount || tx.amount_in_idr || tx.amount || 0);
        }
      });
    } else {
      // Setup default 12 bulan terakhir
      for (let i = 11; i >= 0; i--) {
        const d = subDays(now, i * 30);
        const monthLabel = d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
          month: "short"
        });
        groups[monthLabel] = 0;
      }
      paidTxs.forEach((tx) => {
        const txDate = new Date(tx.created_at);
        if (differenceInDays(now, txDate) < 365) {
          const monthLabel = txDate.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
            month: "short"
          });
          groups[monthLabel] =
            (groups[monthLabel] || 0) + Number(tx.net_amount || tx.amount_in_idr || tx.amount || 0);
        }
      });
    }

    return Object.entries(groups).map(([name, value]) => ({ name, Revenue: value }));
  }, [transactions, revenueFilter, locale]);

  // ==========================================
  // 3. SUBSCRIPTION OVERVIEW (STATUS PIE)
  // ==========================================
  const subscriptionStatusData = useMemo(() => {
    const counts: { [key: string]: number } = { active: 0, canceled: 0, expired: 0, trial: 0 };
    subscriptions.forEach((sub) => {
      const status = sub.status?.toLowerCase();
      if (status === "active") counts.active += 1;
      else if (status === "canceled") counts.canceled += 1;
      else if (status === "expired") counts.expired += 1;
      else if (status === "trial" || status === "trialing") counts.trial += 1;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      percentage: Math.round((value / total) * 100)
    }));
  }, [subscriptions]);

  // ==========================================
  // 4. NEW TENANT GROWTH (MONTHLY GROUP)
  // ==========================================
  const tenantGrowthData = useMemo(() => {
    const groups: { [key: string]: number } = {};
    tenants.forEach((t) => {
      const d = new Date(t.created_at);
      const key = d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
        year: "numeric",
        month: "short"
      });
      groups[key] = (groups[key] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, Tenants: value }))
      .reverse();
  }, [tenants, locale]);

  // ==========================================
  // 5. REVENUE BY PROVIDER (DONUT)
  // ==========================================
  const revenueByProviderData = useMemo(() => {
    const providers: { [key: string]: number } = {};
    transactions
      .filter((tx) =>
        ["paid", "completed", "success", "settlement", "capture"].includes(tx.status?.toLowerCase())
      )
      .forEach((tx) => {
        const prov = tx.provider || "Manual";
        providers[prov] =
          (providers[prov] || 0) + Number(tx.net_amount || tx.amount_in_idr || tx.amount || 0);
      });

    return Object.entries(providers).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  // ==========================================
  // 6. POPULAR PLANS
  // ==========================================
  const popularPlansData = useMemo(() => {
    const plansCount: { [key: string]: number } = {};
    subscriptions.forEach((sub) => {
      const pId = sub.plan_id || "Free";
      plansCount[pId] = (plansCount[pId] || 0) + 1;
    });

    return Object.entries(plansCount)
      .map(([name, count]) => ({ name, Count: count }))
      .sort((a, b) => b.Count - a.Count);
  }, [subscriptions]);

  // ==========================================
  // 7. RECENT TRANSACTIONS (LIMIT 20)
  // ==========================================
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 10);
  }, [transactions]);

  // ==========================================
  // 8. LATEST TENANTS
  // ==========================================
  const latestTenants = useMemo(() => {
    return tenants.slice(0, 5).map((t) => ({
      ...t,
      relativeTime: getRelativeTime(t.created_at)
    }));
  }, [tenants, getRelativeTime]);

  // ==========================================
  // 9. EXPIRING SUBSCRIPTIONS (7 Days Limit)
  // ==========================================
  const expiringSubscriptions = useMemo(() => {
    const now = new Date();
    const limit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return subscriptions
      .filter((sub) => {
        if (!sub.ends_at) return false;
        const end = new Date(sub.ends_at);
        return end >= now && end <= limit && sub.status === "active";
      })
      .map((sub) => ({
        id: sub.id,
        tenantName: sub.tenants?.name || "Unknown Tenant",
        planId: sub.plan_id || "Free",
        endsAt: sub.ends_at,
        daysLeft: differenceInDays(new Date(sub.ends_at!), now)
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [subscriptions]);

  // ==========================================
  // 10. COUPON STATS & ANALYTICS
  // ==========================================
  const couponStats = useMemo(() => {
    const totalRedeemed = coupons.reduce((sum, c) => sum + (c.redeemed_count || 0), 0);

    // Most Used
    const sortedByRedeemed = [...coupons].sort((a, b) => b.redeemed_count - a.redeemed_count);
    const mostUsed = sortedByRedeemed[0]
      ? `${sortedByRedeemed[0].code} (${sortedByRedeemed[0].redeemed_count}x)`
      : "-";

    // Unused Count
    const unusedCount = coupons.filter((c) => c.redeemed_count === 0).length;

    // Expired Count
    const now = new Date();
    const expiredCount = coupons.filter(
      (c) => c.valid_until && isBefore(new Date(c.valid_until), now)
    ).length;

    return {
      totalRedeemed,
      mostUsed,
      unusedCount,
      expiredCount
    };
  }, [coupons]);

  // ==========================================
  // 11. DATABASE MODEL DISTRIBUTION
  // ==========================================
  const dbModelDistribution = useMemo(() => {
    const shared = tenants.filter((t) => t.db_model === "SHARED" && !t.deleted_at).length;
    const isolated = tenants.filter((t) => t.db_model === "ISOLATED" && !t.deleted_at).length;
    const total = shared + isolated || 1;

    return [
      { name: "SHARED DB", value: shared, percentage: Math.round((shared / total) * 100) },
      { name: "ISOLATED DB", value: isolated, percentage: Math.round((isolated / total) * 100) }
    ];
  }, [tenants]);

  // ==========================================
  // 12. TENANT STATUS
  // ==========================================
  const tenantStatusData = useMemo(() => {
    const counts = { active: 0, inactive: 0, suspended: 0, deleted: 0 };
    tenants.forEach((t) => {
      if (t.deleted_at) counts.deleted += 1;
      else if (t.status === "active") counts.active += 1;
      else if (t.status === "inactive") counts.inactive += 1;
      else counts.suspended += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [tenants]);

  // ==========================================
  // 13. USER STATUS
  // ==========================================
  const userStatusData = useMemo(() => {
    const active = profiles.filter((p) => p.status === "active" && !p.deleted_at).length;
    const deleted = profiles.filter((p) => p.status === "deleted" || p.deleted_at).length;
    const banned = profiles.filter((p) => p.status === "banned").length;

    const now = new Date();
    const currentlyBanned = profiles.filter(
      (p) => p.banned_until && isAfter(new Date(p.banned_until), now)
    ).length;

    return { active, deleted, banned, currentlyBanned };
  }, [profiles]);

  // ==========================================
  // 14. CURRENCY DISTRIBUTION
  // ==========================================
  const currencyDistribution = useMemo(() => {
    const counts: { [key: string]: number } = {};
    tenants.forEach((t) => {
      const cur = t.currency || "USD";
      counts[cur] = (counts[cur] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [tenants]);

  // ==========================================
  // 15. TOP PAYING TENANTS
  // ==========================================
  const topPayingTenants = useMemo(() => {
    const map: { [key: string]: { name: string; totalPaid: number } } = {};
    transactions
      .filter((tx) =>
        ["paid", "completed", "success", "settlement", "capture"].includes(tx.status?.toLowerCase())
      )
      .forEach((tx) => {
        const tId = tx.tenant_id;
        const tenantName = tx.tenants?.name || "Unknown Tenant";
        const amt = Number(tx.net_amount || tx.amount_in_idr || tx.amount || 0);

        if (!map[tId]) {
          map[tId] = { name: tenantName, totalPaid: 0 };
        }
        map[tId].totalPaid += amt;
      });

    return Object.values(map)
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 5);
  }, [transactions]);

  // ==========================================
  // 17. NOTIFICATION PANEL DATA
  // ==========================================
  const notifications = useMemo(() => {
    const now = new Date();
    const list: string[] = [];

    // Count subscriptions expiring today
    const expiredToday = subscriptions.filter(
      (sub) => sub.ends_at && isToday(new Date(sub.ends_at))
    ).length;
    if (expiredToday > 0) {
      list.push(`${expiredToday} subscription expired/expiring today`);
    }

    // Count tenants registered in last 24 hours
    const last24h = subDays(now, 1);
    const newTenantsCount = tenants.filter((t) => isAfter(new Date(t.created_at), last24h)).length;
    if (newTenantsCount > 0) {
      list.push(`${newTenantsCount} tenants registered within last 24 hours`);
    }

    // Count failed payments in last 7 days
    const failedPayments = transactions.filter(
      (tx) => tx.status === "failed" && isAfter(new Date(tx.created_at), subDays(now, 7))
    ).length;
    if (failedPayments > 0) {
      list.push(`${failedPayments} payment failures in the last 7 days`);
    }

    // Count coupons expired in last 30 days
    const expiredCoupons = coupons.filter(
      (c) =>
        c.valid_until &&
        isBefore(new Date(c.valid_until), now) &&
        isAfter(new Date(c.valid_until), subDays(now, 30))
    ).length;
    if (expiredCoupons > 0) {
      list.push(`${expiredCoupons} coupons expired recently`);
    }

    return list;
  }, [subscriptions, tenants, transactions, coupons]);

  return {
    locale,
    isLoading,
    date,
    setDate,
    revenueFilter,
    setRevenueFilter,
    metrics,
    revenueChartData,
    subscriptionStatusData,
    tenantGrowthData,
    revenueByProviderData,
    popularPlansData,
    recentTransactions,
    latestTenants,
    expiringSubscriptions,
    couponStats,
    dbModelDistribution,
    tenantStatusData,
    userStatusData,
    currencyDistribution,
    topPayingTenants,
    notifications,
    loadAllDashboardData
  };
}
