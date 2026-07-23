"use client";

import React, { useEffect, useState } from "react";
import { CommandIcon, SearchIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { navItems } from "@/components/layout/sidebar/nav-main";

// Impor klien Supabase
import { supabase } from "@/lib/supabase";
import { membershipRepository } from "@/supabase/repositories/memberships";
import { type PermissionName } from "@/lib/rbac";
import { useTranslations } from "next-intl";

type NavItem = {
  title: string;
  href: string;
  icon?: any;
  permissions?: string[];
  items?: NavItem[];
  displayTitle?: string; // Menyimpan nama gabungan (Induk › Sub-menu)
};

export default function Search() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("common");
  const tmenu = useTranslations("menu");

  // State untuk melacak grup user dan permission organisasi internal
  const [userGroup, setUserGroup] = useState<"users" | "superadmin" | null>(null);
  const [userPermissions, setUserPermissions] = useState<PermissionName[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ambil otoritas (permission) aktif dari Supabase
  const fetchUserAuthority = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setUserGroup(null);
        setUserPermissions(null);
        return;
      }

      const isSuperAdmin =
        user.app_metadata?.role === "superadmin" ||
        user.user_metadata?.role === "superadmin" ||
        user.email === "superadmin@example.com";

      if (isSuperAdmin) {
        setUserGroup("superadmin");
        setUserPermissions(null);
        return;
      }

      setUserGroup("users");

      const orgId = localStorage.getItem("active_org_id");
      if (!orgId) {
        setUserPermissions(null);
        return;
      }

      // Resolve: memberships.role_id → roles → role_permissions → permissions
      const { data, error } = await (await membershipRepository(supabase))
        .query()
        .select("roles(role_permissions(permissions(name)))")
        .eq("tenant_id", orgId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const d = data as any;
      if (d?.roles) {
        const perms = (d.roles.role_permissions ?? [])
          .map((rp: any) => rp.permissions?.name)
          .filter((n: any): n is string => typeof n === "string") as PermissionName[];
        setUserPermissions(perms);
      } else {
        setUserPermissions(null);
      }
    } catch (error) {
      console.error("Gagal mendapatkan otoritas pencarian:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAuthority();

    // Dengarkan event perubahan organisasi aktif
    const handleOrgChange = () => {
      fetchUserAuthority();
    };
    window.addEventListener("storage", handleOrgChange);
    return () => {
      window.removeEventListener("storage", handleOrgChange);
    };
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fungsi rekursif memfilter item menu berdasarkan permission saat ini
  const filterMenuByPermissions = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        if (!item.permissions) return true;
        if (!userPermissions) return false;
        return item.permissions.some((p) => userPermissions.includes(p as PermissionName));
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

  // Filter seluruh grup menu utama berdasarkan userGroup ("users" atau "superadmin")
  const filteredNavItems = navItems
    .filter((group) => {
      if (!group.roles) return true;
      return userGroup ? group.roles.includes(userGroup) : false;
    })
    .map((group) => ({
      ...group,
      items: filterMenuByPermissions(group.items as NavItem[])
    }))
    .filter((group) => group.items.length > 0);

  // Meratakan (flatten) menu secara rekursif dengan menyertakan nama menu induknya
  const getFlatItems = (items: NavItem[], parentTitle?: string): NavItem[] => {
    const flat: NavItem[] = [];
    items.forEach((item) => {
      const currentDisplayTitle = parentTitle ? `${parentTitle} › ${item.title}` : item.title;

      if (item.items && item.items.length > 0) {
        // Teruskan nama menu saat ini sebagai prefix induk bagi sub-item di bawahnya
        flat.push(...getFlatItems(item.items, currentDisplayTitle));
      } else {
        flat.push({
          ...item,
          displayTitle: currentDisplayTitle
        });
      }
    });
    return flat;
  };

  return (
    <div className="lg:flex-1">
      <div className="relative hidden max-w-sm flex-1 lg:block">
        <SearchIcon className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          className="h-9 w-full cursor-pointer rounded-md border ps-10 pe-4 text-sm shadow-xs"
          placeholder={t("search")}
          type="search"
          onFocus={() => setOpen(true)}
          disabled={isLoading}
        />
        <div className="absolute end-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm bg-zinc-200 p-1 font-mono text-xs font-medium sm:flex dark:bg-neutral-700">
          <CommandIcon className="size-3" />
          <span>k</span>
        </div>
      </div>
      <div className="block lg:hidden">
        <Button size="icon" variant="ghost" onClick={() => setOpen(true)} disabled={isLoading}>
          <SearchIcon />
        </Button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>{t("searchdialog.title")}</DialogTitle>
          </DialogHeader>
        </VisuallyHidden>
        <CommandInput placeholder={t("searchdialog.placeholder")} />
        <CommandList>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              <CommandEmpty>{t("searchdialog.empty")}.</CommandEmpty>
              {filteredNavItems.map((route) => {
                const flatGroupItems = getFlatItems(route.items as NavItem[]);
                if (flatGroupItems.length === 0) return null;

                return (
                  <React.Fragment key={route.title}>
                    <CommandGroup heading={tmenu(`${route.title}`)}>
                      {flatGroupItems.map((item, key) => (
                        <CommandItem
                          key={key}
                          onSelect={() => {
                            setOpen(false);
                            router.push(item.href);
                          }}>
                          {item.icon && <item.icon className="me-2 h-4 w-4" />}

                          <span>
                            {(item.displayTitle || item.title)
                              .split(" › ")
                              .map((key) => {
                                const cleanKey = key.startsWith("menu.")
                                  ? key.replace("menu.", "")
                                  : key;
                                return tmenu(cleanKey as any);
                              })
                              .join(" › ")}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                  </React.Fragment>
                );
              })}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
