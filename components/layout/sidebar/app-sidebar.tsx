"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { tenantConfig } from "@/config/tenant";
import { siteConfig } from "@/config/site";
import { ChevronsUpDown, Building2, Check, Plus, Loader2 } from "lucide-react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useIsTablet } from "@/hooks/use-mobile";

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { supabase } from "@/lib/supabase";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { CreateTenantForm } from "../../create-tenant-form";
import { useTranslations } from "next-intl";

// Import komponen TrialCard yang baru dibuat
import { TrialCard } from "@/components/layout/sidebar/trial-card";

const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
};

const setCookie = (name: string, value: string) => {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 30;
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
  const isSuperadmin = user?.app_metadata?.role === "superadmin";
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [subscription, setSubscription] = useState<any>(null);
  const [trialRemaining, setTrialRemaining] = useState<string>("");
  const [isTrialExpired, setIsTrialExpired] = useState<boolean>(false);
  const [isLoadingTrial, setIsLoadingTrial] = useState<boolean>(false);

  const loadUserAndOrganizations = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
      }

      // Panggil Server Action (terautentikasi via HTTP cookies di Vercel, bypass RLS client)
      const { getUserOrganizationsAction } = await import("@/app/actions/tenant");
      let orgs: Organization[] = await getUserOrganizationsAction();

      // Fallback: Jika tenantSlug aktif di URL tapi belum ada di orgs, panggil Server Action detail
      if (tenantSlug && !orgs.some((o) => o.slug === tenantSlug)) {
        try {
          const { getOrganizationDetailsAction } = await import(
            "@/app/(auth)/(users)/[tenant_slug]/organization/general/actions"
          );
          const res = await getOrganizationDetailsAction(tenantSlug);
          if (res.tenant) {
            orgs.unshift({
              id: res.tenant.id,
              name: res.tenant.name,
              slug: res.tenant.slug || tenantSlug,
              logo: res.tenant.logo || null
            });
          }
        } catch (errFallback) {
          console.warn("Fallback tenant resolution error:", errFallback);
        }
      }

      setOrganizations(orgs);
    } catch (error: any) {
      console.error("Gagal memuat data organisasi:", error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };

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
    window.addEventListener("storage", loadUserAndOrganizations);
    return () => window.removeEventListener("storage", loadUserAndOrganizations);
  }, []);

  useEffect(() => {
    if (activeOrg?.id) {
      fetchSubscriptionStatus(activeOrg.id);
    } else {
      setSubscription(null);
    }
  }, [activeOrg?.id]);

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
    const intervalId = setInterval(calculateTime, 60000);

    return () => clearInterval(intervalId);
  }, [subscription]);

  useEffect(() => {
    if (organizations.length > 0) {
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
    } else if (tenantSlug) {
      setActiveOrg({
        id: "",
        name: tenantSlug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        slug: tenantSlug,
        logo: null
      });
    }
  }, [tenantSlug, organizations]);

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname]);

  useEffect(() => {
    setOpen(!isTablet);
  }, [isTablet]);

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
          {isSuperadmin ? (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  className="hover:text-foreground h-9 group-data-[collapsible=icon]:px-0!">
                  <img
                    src={siteConfig.logo}
                    alt={siteConfig.name}
                    className="me-1 size-8 rounded-[5px] transition-all group-data-collapsible:size-6 group-data-[collapsible=icon]:size-8"
                  />
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-bold">{siteConfig.name}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          ) : (
            !tenantConfig.organizations.hideOrganization && (
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
                            <span className="text-muted-foreground text-xs">
                              {t("common.loading")}
                            </span>
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
                        ) : (
                          (organizations.length > 0
                            ? organizations
                            : activeOrg
                            ? [activeOrg]
                            : []
                          ).map((org) => (
                            <DropdownMenuItem
                              key={org.id || org.slug}
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
                                <span className="text-foreground truncate text-sm font-medium">
                                  {org.name}
                                </span>
                              </div>
                              {(activeOrg?.slug === org.slug || activeOrg?.id === org.id) && (
                                <Check className="text-primary ms-auto size-4" />
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
            )
          )}
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-full">
            <NavMain />
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter>
          {/* Memanggil komponen TrialCard yang baru dibuat */}
          {activeOrg && (
            <TrialCard
              slug={activeOrg.slug}
              subscription={subscription}
              trialRemaining={trialRemaining}
              isTrialExpired={isTrialExpired}
              isLoading={isLoadingTrial}
            />
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
