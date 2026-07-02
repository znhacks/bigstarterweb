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
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Impor klien Supabase
import { supabase } from "@/lib/supabase";
import { useLocale } from "next-intl";

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
  roles?: ("Owner" | "Admin" | "Member")[]; // Mendefinisikan role yang diizinkan melihat menu ini
  items?: NavItem[];
};

// Konfigurasi Navigasi Menu berdasarkan Hak Akses Role
export const navItems: NavGroup[] = [
  {
    title: "Menu",
    roles: ["users"],
    items: [
      {
        title: "Classic Dashboard",
        href: "/dashboard",
        icon: ChartPieIcon
      },
      {
        title: "Organization",
        href: "/organization",
        icon: CreditCardIcon,
        roles: ["Owner", "Admin", "Member"],
        items: [
          {
            title: "General",
            href: "/organization/general",
            roles: ["Owner", "Admin", "Member"]
          },
          {
            title: "Member",
            href: "/organization/member",
            roles: ["Owner", "Admin"]
          },
          {
            title: "Billing",
            href: "/organization/billing",
            roles: ["Owner"]
          }
        ]
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        items: [
          {
            title: "General",
            href: "/settings/general"
          },
          {
            title: "Security",
            href: "/settings/security"
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

  // Tentukan arah dropdown melayang secara dinamis berdasarkan bahasa

  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const dropdownSide = isMobile ? "bottom" : locale === "ar" ? "left" : "right";
  // State untuk melacak grup user (users / superadmin) dan role organisasi internal
  const [userGroup, setUserGroup] = useState<"users" | "superadmin" | null>(null);
  const [userRole, setUserRole] = useState<"Owner" | "Admin" | "Member" | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  // Ambil data role aktif dari Supabase
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

      // PERBAIKAN: Menambahkan pengecekan email fallback superadmin@example.com
      const isSuperAdmin =
        user.app_metadata?.role === "superadmin" ||
        user.user_metadata?.role === "superadmin" ||
        user.email === "superadmin@example.com"; // Fallback untuk mempermudah development

      if (isSuperAdmin) {
        setUserGroup("superadmin");
        setUserRole(null); // Superadmin tidak memerlukan role organisasi spesifik
        setIsLoadingRole(false);
        return;
      }

      // 2. Jika bukan superadmin, kategorikan sebagai grup "users"
      setUserGroup("users");

      const orgId = localStorage.getItem("active_org_id");
      if (!orgId) {
        setUserRole(null);
        setIsLoadingRole(false);
        return;
      }

      // Query ke tabel memberships untuk pengguna biasa
      const { data, error } = await supabase
        .from("memberships")
        .select("role")
        .eq("tenant_id", orgId)
        .eq("user_id", user.id)
        .maybeSingle();

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

    // Dengarkan event perubahan organisasi aktif di sidebar
    const handleOrgChange = () => {
      fetchUserRole();
    };
    window.addEventListener("storage", handleOrgChange);
    return () => {
      window.removeEventListener("storage", handleOrgChange);
    };
  }, []);

  // Fungsi rekursif untuk memfilter daftar menu berdasarkan role saat ini
  const filterMenuByRole = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        // Jika tidak dibatasi role, lolos filter (publik)
        if (!item.roles) return true;
        // Jika dibatasi tetapi user belum termuat role-nya, blokir sementara
        if (!userRole) return false;
        // Cek kecocokan role aktif
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
        // Sembunyikan kategori utama jika sub-itemnya kosong setelah di-filter
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

  // Filter seluruh grup menu utama berdasarkan userGroup ("users" atau "superadmin")
  const filteredNavItems = navItems
    .filter((group) => {
      // Jika grup menu tidak membatasi roles, tampilkan untuk semua
      if (!group.roles) return true;
      // Jika membatasi, pastikan grup sesuai dengan userGroup saat ini
      return userGroup ? group.roles.includes(userGroup) : false;
    })
    .map((group) => ({
      ...group,
      items: filterMenuByRole(group.items)
    }))
    .filter((group) => group.items.length > 0);

  // Ganti/tambahkan import useLocale di bagian atas file Anda:

  // Di dalam komponen rendering Anda:

  return (
    <>
      {filteredNavItems.map((nav) => (
        <SidebarGroup key={nav.title}>
          {/* 1. Tambahkan text-start di Group Label */}
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
                            {/* 2. Tambahkan text-start di tombol pemicu dropdown */}
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
                                className="hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10! active:bg-[var(--primary)]/10!"
                                asChild
                                key={subItem.title}>
                                <a href={subItem.href}>{subItem.title}</a>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Collapsible
                        className="group/collapsible block group-data-[collapsible=icon]:hidden"
                        defaultOpen={!!item.items.find((s) => s.href === pathname)}>
                        <CollapsibleTrigger asChild>
                          {/* 3. Tambahkan text-start di tombol pemicu collapsible */}
                          <SidebarMenuButton
                            className="hover:text-foreground active:text-foreground text-start hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                            tooltip={item.title}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:-scale-x-100" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="border-s ps-2">
                            {" "}
                            {/* Menggunakan border logis */}
                            {item?.items?.map((subItem, key) => (
                              <SidebarMenuSubItem key={key}>
                                {/* 4. Tambahkan text-start di sub-tombol */}
                                <SidebarMenuSubButton
                                  className="hover:text-foreground active:text-foreground text-start hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                                  isActive={pathname === subItem.href}
                                  asChild>
                                  <Link href={subItem.href} target={subItem.newTab ? "_blank" : ""}>
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
                    /* 5. Tambahkan text-start di tombol menu biasa */
                    <SidebarMenuButton
                      className="hover:text-foreground active:text-foreground text-start hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                      isActive={pathname === item.href}
                      tooltip={item.title}
                      asChild>
                      <Link href={item.href} target={item.newTab ? "_blank" : ""}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                  {/* ... badge lainnya ... */}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
