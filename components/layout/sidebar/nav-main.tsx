"use client";

import { useEffect, useState } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
} from "@/components/ui/sidebar";
import {
  ChevronRight,
  ChartPieIcon,
  CreditCardIcon,
  type LucideIcon,
  Loader2,
  Settings,
  Users,
  Building2,
  ShieldCheck,
  TicketPercent,
  Package,
  ReceiptText,
  LayoutDashboard,
  BadgeCheck,
  Headset,
  Bell,
  Activity,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePathname, useParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { supabase } from "@/lib/supabase";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { profileRepository } from "@/supabase/repositories/profiles";
import { useLocale, useTranslations } from "next-intl";
import { PERMISSIONS, type PermissionName } from "@/modules/rbac/shared";

const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
};

type NavGroup = {
  title: string;
  roles?: ("users" | "superadmin")[];
  items: NavItem[];
};

type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  isComing?: boolean;
  isDataBadge?: string;
  isNew?: boolean;
  newTab?: boolean;
  permissions?: PermissionName[];
  items?: NavItem[];
  tenantScoped?: boolean;
};

export const navItems: NavGroup[] = [
  {
    title: "menu",
    roles: ["users"],
    items: [
      {
        title: "users.dashboard",
        href: `/dashboard`,
        tenantScoped: true,
        icon: ChartPieIcon,
        permissions: [PERMISSIONS.dashboardView]
      },
      {
        title: "users.billing",
        href: "/pricing",
        tenantScoped: true,
        icon: CreditCardIcon,
        permissions: [PERMISSIONS.billingRead]
      },
      {
        title: "users.monitoring",
        href: "/monitoring/activity-logs",
        icon: Activity,
        items: [
          {
            title: "users.activity-logs",
            href: "/monitoring/activity-logs",
            tenantScoped: true
          },
          {
            title: "users.manage-users",
            href: "/monitoring/manage-users",
            tenantScoped: true
          },
          {
            title: "users.journals",
            href: "/monitoring/journals",
            tenantScoped: true
          }
        ]
      },
      {
        title: "users.settings",
        href: "/settings/general",
        icon: Settings,
        items: [
          {
            title: "users.account",
            href: "/settings/general"
          },
          {
            title: "users.organization",
            href: "/organization/general",
            tenantScoped: true,
            permissions: [PERMISSIONS.organizationRead]
          }
        ]
      }
    ]
  },
  {
    title: "menu",
    roles: ["superadmin"],
    items: [
      {
        title: "superadmin.dashboard",
        href: "/superadmin/dashboard",
        icon: ChartPieIcon
      },
      {
        title: "superadmin.users",
        href: "/superadmin/users",
        icon: Users
      },
      {
        title: "superadmin.roles",
        href: "/superadmin/roles",
        icon: ShieldCheck
      },
      {
        title: "superadmin.security-logs",
        href: "/superadmin/security-logs",
        icon: ShieldAlert
      },
      {
        title: "superadmin.organization",
        href: "/superadmin/organizations",
        icon: Building2
      },
      {
        title: "superadmin.plans",
        href: "/superadmin/plans",
        icon: Package
      },
      {
        title: "superadmin.coupons",
        href: "/superadmin/coupons",
        icon: TicketPercent
      },
      {
        title: "superadmin.billing",
        href: "/superadmin/billing",
        icon: CreditCardIcon,
        items: [
          {
            title: "superadmin.billing-dashboard",
            href: "/superadmin/billing/dashboard"
          },
          {
            title: "superadmin.subscriptions",
            href: "/superadmin/billing/subscriptions"
          },
          {
            title: "superadmin.history-transactions",
            href: "/superadmin/billing/histories"
          }
        ]
      },
      {
        title: "superadmin.notifications",
        href: "/superadmin/notifications",
        icon: Bell,
        items: [
          {
            title: "superadmin.notifications-templates",
            href: "/superadmin/notifications/templates"
          },
          {
            title: "superadmin.notifications-announcements",
            href: "/superadmin/notifications/announcements"
          },
          {
            title: "superadmin.notifications-delivery-logs",
            href: "/superadmin/notifications/delivery-logs"
          },
          {
            title: "superadmin.notifications-preferences",
            href: "/superadmin/notifications/preferences"
          }
        ]
      },
      {
        title: "superadmin.enterprise",
        href: "/superadmin/enterprise",
        icon: Headset
      }
    ]
  }
];

export function NavMain() {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const tenantSlug = params?.tenant_slug as string | undefined;
  const t = useTranslations("menu");

  const { isMobile } = useSidebar();
  const dropdownSide = isMobile ? "bottom" : locale === "ar" ? "left" : "right";

  const [userGroup, setUserGroup] = useState<"users" | "superadmin" | null>(null);
  const [userPermissions, setUserPermissions] = useState<PermissionName[] | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  const getLocalizedHref = (href: string, tenantScoped?: boolean) => {
    if (!tenantScoped) {
      return href;
    }
    const slug = tenantSlug || activeSlug;
    if (slug && href.startsWith("/")) {
      if (href.startsWith(`/${slug}`)) {
        return href;
      }
      return `/${slug}${href}`;
    }
    return href;
  };

  const fetchUserAuthority = async () => {
    try {
      const membershipRepo = await membershipRepository(supabase);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setUserGroup(null);
        setUserPermissions(null);
        setIsLoadingRole(false);
        return;
      }

      try {
        const { data: membershipData, error: membershipError } = await membershipRepo
          .query()
          .select("tenants!inner(slug)")
          .eq("user_id", user.id);

        if (membershipError) throw membershipError;

        if (membershipData && membershipData.length > 0) {
          const tenantList = membershipData
            .map((m: any) => m.tenants)
            .filter((t): t is { slug: string } => !!t && typeof t.slug === "string");

          if (tenantList.length > 0) {
            setActiveSlug(tenantList[0].slug);
          }
        }
      } catch (err) {
        console.error("Gagal mendapatkan daftar tenant (client-side):", err);
      }

      let isSuperAdmin =
        user.app_metadata?.role === "superadmin" ||
        user.user_metadata?.role === "superadmin" ||
        user.email === "superadmin@example.com";

      if (!isSuperAdmin) {
        try {
          const profileRepo = await profileRepository(supabase);
          const { data: profile } = await profileRepo
            .query()
            .select("is_superadmin")
            .eq("id", user.id)
            .maybeSingle();

          if ((profile as any)?.is_superadmin === true) {
            isSuperAdmin = true;
          }
        } catch (err) {
          console.error("Gagal mengecek status superadmin di nav-main:", err);
        }
      }

      if (isSuperAdmin) {
        setUserGroup("superadmin");
        setUserPermissions(null);
        setIsLoadingRole(false);
        return;
      }

      setUserGroup("users");

      const AUTHORITY_SELECT = "roles(name, hierarchy_level, role_permissions(permissions(name)))";

      let data: any = null;
      let error: any = null;

      if (tenantSlug) {
        const { data: resData, error: resError } = await membershipRepo
          .query()
          .select(`${AUTHORITY_SELECT}, tenants!inner(slug)`)
          .eq("tenants.slug", tenantSlug)
          .eq("user_id", user.id)
          .maybeSingle();
        data = resData;
        error = resError;
      } else {
        const activeTenantId =
          getCookie("active_tenant_id") || localStorage.getItem("active_org_id");
        if (activeTenantId) {
          const { data: resData, error: resError } = await membershipRepo
            .query()
            .select(AUTHORITY_SELECT)
            .eq("tenant_id", activeTenantId)
            .eq("user_id", user.id)
            .maybeSingle();
          data = resData;
          error = resError;
        }
      }

      if (error) throw error;

      if (data?.roles) {
        const perms = (data.roles.role_permissions ?? [])
          .map((rp: any) => rp.permissions?.name)
          .filter((n: any): n is string => typeof n === "string") as PermissionName[];
        setUserPermissions(perms.length > 0 ? perms : (Object.values(PERMISSIONS) as PermissionName[]));
      } else {
        setUserPermissions(Object.values(PERMISSIONS) as PermissionName[]);
      }
    } catch (error) {
      console.error("Gagal mendapatkan otoritas navigasi:", error);
    } finally {
      setIsLoadingRole(false);
    }
  };

  useEffect(() => {
    fetchUserAuthority();

    const handleOrgChange = () => {
      fetchUserAuthority();
    };
    window.addEventListener("storage", handleOrgChange);
    return () => {
      window.removeEventListener("storage", handleOrgChange);
    };
  }, [tenantSlug]);

  const filterMenuByPermissions = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        if (!item.permissions) return true;
        if (!userPermissions) return false;
        return item.permissions.some((p) => userPermissions.includes(p));
      })
      .map((item) => {
        if (item.items) {
          return {
            ...item,
            items: filterMenuByPermissions(item.items)
          };
        }
        return item;
      })
      .filter((item) => {
        if (item.items && item.items.length === 0) {
          return false;
        }
        return true;
      });
  };

  if (isLoadingRole) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  const filteredNavItems = navItems
    .filter((group) => {
      if (!group.roles) return true;
      return userGroup ? group.roles.includes(userGroup) : false;
    })
    .map((group) => ({
      ...group,
      items: filterMenuByPermissions(group.items)
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {filteredNavItems.map((nav) => (
        <SidebarGroup key={nav.title}>
          {}
          <SidebarGroupLabel className="text-start">{t(nav.title)}</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {nav.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {Array.isArray(item.items) && item.items.length > 0 ? (
                    <>
                      <div className="hidden group-data-[collapsible=icon]:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {}
                            <SidebarMenuButton className="text-start" tooltip={t(item.title)}>
                              {item.icon && <item.icon />}
                              <span>{t(item.title)}</span>
                              <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:-scale-x-100" />
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side={dropdownSide}
                            align={isMobile ? "end" : "start"}
                            className="min-w-48 rounded-lg">
                            <DropdownMenuLabel>{t(item.title)}</DropdownMenuLabel>
                            {item.items?.map((subItem) => (
                              <DropdownMenuItem
                                className="hover:text-foreground active:text-foreground hover:bg-(--primary)/10! active:bg-(--primary)/10!"
                                asChild
                                key={subItem.title}>
                                <a href={getLocalizedHref(subItem.href, subItem.tenantScoped)}>
                                  {}
                                  {t(subItem.title)}
                                </a>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Collapsible
                        className="group/collapsible block group-data-[collapsible=icon]:hidden"
                        defaultOpen={
                          !!item.items.find(
                            (s) => getLocalizedHref(s.href, s.tenantScoped) === pathname
                          )
                        }>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className="hover:text-foreground active:text-foreground text-start hover:bg-(--primary)/10 active:bg-(--primary)/10"
                            tooltip={t(item.title)}>
                            {item.icon && <item.icon />}
                            <span>{t(item.title)}</span>
                            <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:-scale-x-100" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="border-s ps-2">
                            {item?.items?.map((subItem, key) => (
                              <SidebarMenuSubItem key={key}>
                                <SidebarMenuSubButton
                                  className="hover:text-foreground active:text-foreground text-start hover:bg-(--primary)/10 active:bg-(--primary)/10"
                                  isActive={
                                    pathname ===
                                    getLocalizedHref(subItem.href, subItem.tenantScoped)
                                  }
                                  asChild>
                                  <Link
                                    href={getLocalizedHref(subItem.href, subItem.tenantScoped)}
                                    target={subItem.newTab ? "_blank" : ""}>
                                    {}
                                    <span>{t(subItem.title)}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  ) : (
                    <SidebarMenuButton
                      className="hover:text-foreground active:text-foreground text-start hover:bg-(--primary)/10 active:bg-(--primary)/10"
                      isActive={pathname === getLocalizedHref(item.href, item.tenantScoped)}
                      tooltip={t(item.title)}
                      asChild>
                      <Link
                        href={getLocalizedHref(item.href, item.tenantScoped)}
                        target={item.newTab ? "_blank" : ""}>
                        {item.icon && <item.icon />}
                        <span>{t(item.title)}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
