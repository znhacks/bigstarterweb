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
  Building2
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
import { useLocale } from "next-intl";

// Helper client-side untuk membaca Cookie
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
  roles?: ("Owner" | "Admin" | "Member")[];
  items?: NavItem[];
  tenantScoped?: boolean; // Menandakan apakah halaman ini membutuhkan tenant slug
};

export const navItems: NavGroup[] = [
  {
    title: "Menu",
    roles: ["users"],
    items: [
      {
        title: "Classic Dashboard",
        href: `/dashboard`,
        tenantScoped: true, // Butuh tenant slug
        icon: ChartPieIcon
      },
      {
        title: "Settings",
        href: "/settings/general", // Global (tidak menggunakan tenantScoped)
        icon: Settings,
        items: [
          {
            title: "Account",
            href: "/settings/general"
          },
          {
            title: "Organization",
            href: "/organization/general",
            tenantScoped: true
          }
        ]
      }
    ]
  },
  {
    title: "Menu",
    roles: ["superadmin"],
    items: [
      {
        title: "Dashboard",
        href: "/superadmin/dashboard",
        icon: ChartPieIcon
      },
      {
        title: "Users",
        href: "/superadmin/users",
        icon: Users
      },
      {
        title: "Organization",
        href: "/superadmin/organizations",
        icon: Building2
      },
      {
        title: "Billing",
        href: "/superadmin/billing",
        icon: CreditCardIcon
      }
    ]
  }
];

export function NavMain() {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams(); // Membaca param URL dinamis
  const tenantSlug = params?.tenant_slug as string | undefined; // Ambil slug organisasi aktif dari URL

  const { isMobile } = useSidebar();
  const dropdownSide = isMobile ? "bottom" : locale === "ar" ? "left" : "right";

  const [userGroup, setUserGroup] = useState<"users" | "superadmin" | null>(null);
  const [userRole, setUserRole] = useState<"Owner" | "Admin" | "Member" | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  // Helper untuk melokalisasi link berdasarkan tenant slug aktif
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

  const fetchUserRole = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setUserGroup(null);
        setUserRole(null);
        setIsLoadingRole(false);
        return;
      }

      // Mengambil daftar tenant secara asinkron dari client-side untuk menentukan fallback slug
      try {
        const { data: membershipData, error: membershipError } = await supabase
          .from("memberships")
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

      const isSuperAdmin =
        user.app_metadata?.role === "superadmin" ||
        user.user_metadata?.role === "superadmin" ||
        user.email === "superadmin@example.com";

      if (isSuperAdmin) {
        setUserGroup("superadmin");
        setUserRole(null);
        setIsLoadingRole(false);
        return;
      }

      setUserGroup("users");

      let data: any = null;
      let error: any = null;

      if (tenantSlug) {
        // OPSI A: Jika ada slug di URL, langsung query berdasarkan slug
        const { data: resData, error: resError } = await supabase
          .from("memberships")
          .select("role, tenants!inner(slug)")
          .eq("tenants.slug", tenantSlug)
          .eq("user_id", user.id)
          .maybeSingle();
        data = resData;
        error = resError;
      } else {
        // OPSI B: Jika flat URL, gunakan Cookie active_tenant_id
        const activeTenantId =
          getCookie("active_tenant_id") || localStorage.getItem("active_org_id");
        if (activeTenantId) {
          const { data: resData, error: resError } = await supabase
            .from("memberships")
            .select("role")
            .eq("tenant_id", activeTenantId)
            .eq("user_id", user.id)
            .maybeSingle();
          data = resData;
          error = resError;
        }
      }

      if (error) throw error;

      if (data) {
        setUserRole(data.role as "Owner" | "Admin" | "Member");
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error("Gagal mendapatkan role navigasi:", error);
    } finally {
      setIsLoadingRole(false);
    }
  };

  useEffect(() => {
    fetchUserRole();

    const handleOrgChange = () => {
      fetchUserRole();
    };
    window.addEventListener("storage", handleOrgChange);
    return () => {
      window.removeEventListener("storage", handleOrgChange);
    };
  }, [tenantSlug]);

  const filterMenuByRole = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        if (!item.roles) return true;
        if (!userRole) return false;
        return item.roles.includes(userRole);
      })
      .map((item) => {
        if (item.items) {
          return {
            ...item,
            items: filterMenuByRole(item.items)
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
      items: filterMenuByRole(group.items)
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {filteredNavItems.map((nav) => (
        <SidebarGroup key={nav.title}>
          <SidebarGroupLabel className="text-start">{nav.title}</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {nav.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {Array.isArray(item.items) && item.items.length > 0 ? (
                    <>
                      <div className="hidden group-data-[collapsible=icon]:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton className="text-start" tooltip={item.title}>
                              {item.icon && <item.icon />}
                              <span>{item.title}</span>
                              <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:-scale-x-100" />
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side={dropdownSide}
                            align={isMobile ? "end" : "start"}
                            className="min-w-48 rounded-lg">
                            <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                            {item.items?.map((subItem) => (
                              <DropdownMenuItem
                                className="hover:text-foreground active:text-foreground hover:bg-(--primary)/10! active:bg-(--primary)/10!"
                                asChild
                                key={subItem.title}>
                                <a href={getLocalizedHref(subItem.href, subItem.tenantScoped)}>
                                  {subItem.title}
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
                            tooltip={item.title}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
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
                                    <span>{subItem.title}</span>
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
                      tooltip={item.title}
                      asChild>
                      <Link
                        href={getLocalizedHref(item.href, item.tenantScoped)}
                        target={item.newTab ? "_blank" : ""}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
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
