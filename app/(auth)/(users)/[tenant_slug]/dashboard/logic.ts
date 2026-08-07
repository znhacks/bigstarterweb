"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { id, enUS } from "date-fns/locale";
import { profileRepository } from "@/supabase/repositories/profiles";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { subscriptionRepository } from "@/supabase/repositories/subscriptions";
import { transactionRepository } from "@/supabase/repositories/transactions";

// Helper client-side untuk Cookie (Diselaraskan dengan AppSidebar)
const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
};

export function useUserWorkspaceDashboard() {
  const locale = useLocale();
  const params = useParams();
  const tenantSlug = params?.tenant_slug as string | undefined;

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);

  // State Multi-Tenant
  const [memberships, setMemberships] = useState<any[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  // State data terikat dengan Tenant Aktif
  const [activeTenant, setActiveTenant] = useState<any | null>(null);
  const [tenantMembers, setTenantMembers] = useState<any[]>([]);
  const [tenantSubscription, setTenantSubscription] = useState<any | null>(null);
  const [tenantTransactions, setTenantTransactions] = useState<any[]>([]);

  // 1. Memuat data profil pengguna & daftar keanggotaan organisasi
  const loadUserAndMemberships = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await (await profileRepository(supabase)).query().select("*").eq("id", user.id).single();
      setProfile(prof);

      const { data: memberList, error } = await (await membershipRepository(supabase))
        .query()
        .select(
          `
          id,
          created_at,
          tenant_id,
          role_id,
          tenants (
            id,
            name,
            slug,
            logo,
            status,
            created_at,
            default_locale,
            timezone,
            currency,
            business_email
          ),
          roles (
            id,
            name
          )
        `
        )
        .eq("user_id", user.id);

      let list: any[] = (memberList as any[]) || [];

      if (list.length === 0) {
        const { getUserOrganizationsAction } = await import("@/app/actions/tenant");
        const serverOrgs = await getUserOrganizationsAction();
        if (serverOrgs.length > 0) {
          list = serverOrgs.map((o) => ({
            id: o.id,
            tenant_id: o.id,
            role_id: "member",
            tenants: o,
            roles: { id: "member", name: "Member" }
          }));
        }
      }

      // Fallback: Jika memberList kosong tetapi tenantSlug ada di URL, query langsung dari tabel tenants
      if (list.length === 0 && tenantSlug) {
        const { data: directTenant } = await supabase
          .from("tenants")
          .select("id, name, slug, logo, status, created_at, default_locale, timezone, currency, business_email")
          .ilike("slug", tenantSlug)
          .maybeSingle();

        if (directTenant) {
          list = [
            {
              id: "fallback",
              tenant_id: directTenant.id,
              role_id: "member",
              tenants: directTenant,
              roles: { id: "member", name: "Member" }
            }
          ];
        }
      }

      setMemberships(list);
    } catch (e) {
      console.error("Gagal memuat parameter keanggotaan pengguna:", e);
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    loadUserAndMemberships();
  }, [loadUserAndMemberships]);

  // 2. Sinkronisasi aktifasi tenant berdasarkan URL (slug) atau Cookie/LocalStorage
  useEffect(() => {
    if (memberships.length === 0) return;

    let targetTenant: any = null;

    if (tenantSlug) {
      // Prioritas 1: Sesuai dengan parameter slug URL saat ini
      const matched = memberships.find((m) => m.tenants?.slug === tenantSlug);
      if (matched) targetTenant = matched.tenants;
    } else {
      // Prioritas 2: Membaca fallback cookie/localStorage (Diselaraskan dengan AppSidebar)
      const savedTenantId = getCookie("active_tenant_id") || localStorage.getItem("active_org_id");
      const matched = memberships.find((m) => m.tenant_id === savedTenantId);
      if (matched) targetTenant = matched.tenants;
    }

    // Default: Jika tidak ditemukan kecocokan, gunakan workspace pertama yang tersedia
    const finalTenant = targetTenant || memberships[0]?.tenants;
    if (finalTenant) {
      setActiveTenantId(finalTenant.id);
      setActiveTenant(finalTenant);
    }
  }, [tenantSlug, memberships]);

  // 3. Mengambil data transaksi, langganan, dan anggota tim untuk Tenant yang aktif
  const loadActiveTenantData = useCallback(async (tenantId: string) => {
    try {
      const [membersRes, subRes, txsRes] = await Promise.all([
        (await membershipRepository(supabase)).query().select("*, profiles(*), roles(*)").eq("tenant_id", tenantId),
        (await subscriptionRepository(supabase)).query().select("*").eq("tenant_id", tenantId).maybeSingle(),
        (await transactionRepository(supabase))
          .query()
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(5)
      ]);

      setTenantMembers(membersRes.data || []);
      setTenantSubscription(subRes.data || null);
      setTenantTransactions(txsRes.data || []);
    } catch (e) {
      console.error("Gagal memuat relasi data workspace aktif:", e);
    }
  }, []);

  useEffect(() => {
    if (activeTenantId) {
      loadActiveTenantData(activeTenantId);
    }
  }, [activeTenantId, loadActiveTenantData]);

  // 4. Integrasi Event Listener "active-org-changed" dari Sidebar
  useEffect(() => {
    const handleOrgChangedEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newTenantId = customEvent.detail?.tenantId;
      if (newTenantId && memberships.length > 0) {
        const matched = memberships.find((m) => m.tenant_id === newTenantId);
        if (matched) {
          setActiveTenantId(matched.tenant_id);
          setActiveTenant(matched.tenants);
        }
      }
    };

    window.addEventListener("active-org-changed", handleOrgChangedEvent);
    return () => {
      window.removeEventListener("active-org-changed", handleOrgChangedEvent);
    };
  }, [memberships]);

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

  const metrics = useMemo(() => {
    const totalOrganizations = memberships.length;
    const totalTeamMembers = tenantMembers.length;

    let activePlanName = "No Active Subscription";
    if (tenantSubscription && tenantSubscription.status === "active") {
      activePlanName = tenantSubscription.plan_id
        ? `${tenantSubscription.plan_id.toUpperCase()} PLAN`
        : "FREE PLAN";
    }

    let billingStatus = "No Upcoming Billing";
    if (tenantSubscription && tenantSubscription.ends_at) {
      const expirationDate = new Date(tenantSubscription.ends_at);
      const formattedDate = expirationDate.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
        day: "numeric",
        month: "long"
      });
      billingStatus =
        tenantSubscription.status === "active"
          ? `Renew ${formattedDate}`
          : `Expires ${formattedDate}`;
    }

    return {
      totalOrganizations,
      totalTeamMembers,
      activePlanName,
      billingStatus
    };
  }, [memberships, tenantMembers, tenantSubscription, locale]);

  const usageStats = useMemo(
    () => [
      { name: "Storage", percentage: 45, label: "4.5 GB / 10 GB" },
      { name: "API Calls", percentage: 12, label: "1,200 / 10,000" },
      { name: "Projects", percentage: 40, label: "4 / 10" },
      { name: "Seats", percentage: 72, label: `${tenantMembers.length} / 25` }
    ],
    [tenantMembers]
  );

  const recentActivities = useMemo(
    () => [
      { event: "Subscription renewed successfully", time: "2 hours ago" },
      { event: "Workspace configuration updated", time: "1 day ago" },
      { event: "Coupon WELCOME50 applied", time: "Last week" }
    ],
    []
  );

  return {
    locale,
    isLoading,
    profile,
    memberships,
    activeTenant,
    tenantMembers,
    tenantSubscription,
    tenantTransactions,
    metrics,
    usageStats,
    recentActivities,
    getRelativeTime,
    reloadWorkspaceData: () => activeTenantId && loadActiveTenantData(activeTenantId)
  };
}
