// app/components/layout/sidebar/index.tsx (atau letak file AppSidebar Anda)
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  ChevronsUpDown,
  Building2,
  Check,
  Plus,
  Loader2,
  AlertTriangle,
  Clock
} from "lucide-react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useIsTablet } from "@/hooks/use-mobile";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/layout/sidebar/nav-main";
import { NavUser } from "@/components/layout/sidebar/nav-user";
import { ScrollArea } from "@/components/ui/scroll-area";
import Logo from "@/components/layout/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { supabase } from "@/lib/supabase";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { roleRepository } from "@/supabase/repositories/roles";
import { CreateTenantForm } from "../../create-tenant-form";
import { useTranslations } from "next-intl";

// Helper client-side untuk Cookie
const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
};

const setCookie = (name: string, value: string) => {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 30; // 30 hari
  const secure = window.location.protocol === "https:" ? "Secure;" : "";
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax; ${secure}`;
};

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params?.tenant_slug as string | undefined;
  const t = useTranslations();

  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const isTablet = useIsTablet();

  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  // State baru untuk penanganan realtime Trial
  const [subscription, setSubscription] = useState<any>(null);
  const [trialRemaining, setTrialRemaining] = useState<string>("");
  const [isTrialExpired, setIsTrialExpired] = useState<boolean>(false);
  const [isLoadingTrial, setIsLoadingTrial] = useState<boolean>(false);

  // 1. Memuat Pengguna & Daftar Organisasi dari Database
  const loadUserAndOrganizations = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user: currentUser },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        setIsLoading(false);
        return;
      }
      setUser(currentUser);

      const { data, error } = await (
        await membershipRepository(supabase)
      )
        .query()
        .select(
          `
          tenant_id,
          tenants (
            id,
            name,
            slug,
            logo
          )
        `
        )
        .eq("user_id", currentUser.id);

      if (error) throw error;

      const orgs: Organization[] = (data || [])
        .map((item: any) => item.tenants)
        .filter((tenant): tenant is any => tenant !== null)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          logo: t.logo || null
        }));

      setOrganizations(orgs);
    } catch (error: any) {
      console.error("Gagal memuat data organisasi:", error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  // Ambil data status trial ketika organisasi aktif berubah
  const fetchSubscriptionStatus = async (orgId: string) => {
    setIsLoadingTrial(true);
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, ends_at, plan_id")
        .eq("tenant_id", orgId)
        .in("status", ["trialing", "active", "expired"])
        .maybeSingle();

      if (error) throw error;
      setSubscription(data || null);
    } catch (err) {
      console.error("Gagal memuat status trial:", err);
    } finally {
      setIsLoadingTrial(false);
    }
  };

  useEffect(() => {
    loadUserAndOrganizations();
  }, []);

  useEffect(() => {
    if (activeOrg?.id) {
      fetchSubscriptionStatus(activeOrg.id);
    } else {
      setSubscription(null);
    }
  }, [activeOrg?.id]);

  // Handler Realtime Penghitung Mundur Sisa Hari, Jam, Menit Trial
  useEffect(() => {
    if (!subscription || subscription.status !== "trialing" || !subscription.ends_at) {
      setTrialRemaining("");
      setIsTrialExpired(subscription?.status === "expired");
      return;
    }

    const endsAt = new Date(subscription.ends_at).getTime();

    const calculateTime = () => {
      const now = new Date().getTime();
      const diff = endsAt - now;

      if (diff <= 0) {
        setTrialRemaining("Expired");
        setIsTrialExpired(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      let text = "";
      if (days > 0) {
        text = `${days} hari ${hours} jam`;
      } else if (hours > 0) {
        text = `${hours} jam ${minutes} menit`;
      } else {
        text = `${minutes} menit`;
      }

      setTrialRemaining(text);
      setIsTrialExpired(false);
    };

    calculateTime();
    const intervalId = setInterval(calculateTime, 60000); // Perbarui waktu setiap 1 menit

    return () => clearInterval(intervalId);
  }, [subscription]);

  useEffect(() => {
    if (organizations.length === 0) return;

    let targetOrg: Organization | null = null;

    if (tenantSlug) {
      targetOrg = organizations.find((o) => o.slug === tenantSlug) || null;
    } else {
      const savedOrgId = getCookie("active_tenant_id") || localStorage.getItem("active_org_id");
      targetOrg = organizations.find((o) => o.id === savedOrgId) || null;
    }

    const finalActiveOrg = targetOrg || organizations[0];
    setActiveOrg(finalActiveOrg);

    if (finalActiveOrg) {
      localStorage.setItem("active_org_id", finalActiveOrg.id);
      setCookie("active_tenant_id", finalActiveOrg.id);
    }
  }, [tenantSlug, organizations]);

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname]);

  useEffect(() => {
    setOpen(!isTablet);
  }, [isTablet]);

  // 3. Handler saat memilih Organisasi dari Dropdown
  const handleSelectOrg = (org: Organization) => {
    setActiveOrg(org);
    localStorage.setItem("active_org_id", org.id);
    setCookie("active_tenant_id", org.id);

    window.dispatchEvent(
      new CustomEvent("active-org-changed", {
        detail: { tenantId: org.id, tenantSlug: org.slug }
      })
    );

    if (tenantSlug && pathname) {
      const segments = pathname.split("/");
      const slugIndex = segments.indexOf(tenantSlug);

      if (slugIndex !== -1) {
        segments[slugIndex] = org.slug;
        const newPath = segments.join("/");
        router.push(newPath);
      } else {
        router.push(`/${org.slug}/dashboard`);
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="hover:text-foreground h-9 group-data-[collapsible=icon]:px-0!">
                    {activeOrg?.logo ? (
                      <img
                        src={activeOrg.logo}
                        alt={activeOrg.name}
                        className="me-1 size-8 rounded-[5px] transition-all group-data-collapsible:size-6 group-data-[collapsible=icon]:size-8"
                      />
                    ) : (
                      <Logo />
                    )}
                    <span className="text-foreground truncate font-semibold">
                      {isLoading ? (
                        <span className="text-muted-foreground text-xs">{t("common.loading")}</span>
                      ) : activeOrg ? (
                        activeOrg.name
                      ) : (
                        t("common.notenant")
                      )}
                    </span>
                    <ChevronsUpDown className="ms-auto group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="mt-4 w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}>
                  <DropdownMenuLabel>{t("menu.users.organization")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <div className="max-h-48 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                      </div>
                    ) : organizations.length === 0 ? (
                      <div className="text-muted-foreground px-2 py-3 text-center text-xs">
                        {t("common.noorgfound")}
                      </div>
                    ) : (
                      organizations.map((org) => (
                        <DropdownMenuItem
                          key={org.id}
                          className="flex cursor-pointer items-center gap-3"
                          onSelect={() => handleSelectOrg(org)}>
                          <div
                            className={`flex size-8 items-center justify-center overflow-hidden ${
                              org.logo ? "" : "bg-background rounded-md border"
                            }`}>
                            {org.logo ? (
                              <img
                                src={org.logo}
                                alt={org.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <Building2 className="text-muted-foreground size-4" />
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="text-muted-foreground truncate text-sm font-medium">
                              {org.name}
                            </span>
                            <span
                              className={`text-xs ${
                                activeOrg?.id === org.id
                                  ? "font-semibold text-green-700"
                                  : "text-muted-foreground"
                              }`}>
                              {activeOrg?.id === org.id ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {activeOrg?.id === org.id && (
                            <Check className="ms-auto size-4 text-green-700" />
                          )}
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="focus:bg-accent flex cursor-pointer items-center gap-2"
                    disabled={isLoading}
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsDialogOpen(true);
                      setDropdownOpen(false);
                    }}>
                    <Plus className="size-4" />
                    <span>{t("common.neworg")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-full">
            <NavMain />
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter>
          {/* ========================================================
              WIDGET TRIAL STATUS (DILETAKKAN DI ATAS NAVUSER)
             ======================================================== */}
          {activeOrg && !isLoadingTrial && (
            <>
              {/* STATE 1: TRIAL AKTIF (TRIALING) */}
              {subscription?.status === "trialing" && !isTrialExpired && trialRemaining && (
                <div className="mb-2 px-3 py-1 group-data-[collapsible=icon]:hidden">
                  <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900/30 dark:bg-amber-950/15">
                    <CardContent className="p-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            Trial Aktif
                          </span>
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-100 px-1.5 py-0 text-[9px] font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                            Uji Coba
                          </Badge>
                        </div>
                        <div className="text-muted-foreground text-[11px] leading-normal">
                          Sisa waktu:{" "}
                          <span className="font-bold text-amber-900 dark:text-amber-300">
                            {trialRemaining}
                          </span>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className="h-7 w-full border-none bg-amber-600 text-[11px] font-semibold text-white shadow-none hover:bg-amber-700">
                          <Link href={`/${activeOrg.slug}/organization/billing`}>
                            Upgrade Paket
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* STATE 2: TRIAL HABIS (EXPIRED) */}
              {(isTrialExpired || subscription?.status === "expired") && (
                <div className="mb-2 px-3 py-1 group-data-[collapsible=icon]:hidden">
                  <Card className="py-0">
                    <CardContent className="">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs font-bold text-red-800 dark:text-red-400">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                            Trial Habis
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Masa uji coba gratis organisasi Anda telah berakhir. Upgrade untuk
                          memulihkan akses fitur.
                        </p>
                        <Button
                          asChild
                          size="sm"
                          variant="destructive"
                          className="h-7 w-full text-[11px] font-semibold">
                          <Link href={`/${activeOrg.slug}/organization/billing`}>
                            Upgrade Sekarang
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

          <NavUser />
        </SidebarFooter>
      </Sidebar>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("common.addneworg")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <CreateTenantForm />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
