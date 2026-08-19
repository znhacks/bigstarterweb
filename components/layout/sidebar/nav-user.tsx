"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { BellIcon, CreditCardIcon, LogOutIcon, UserCircle2Icon, Loader2 } from "lucide-react";
import { DotsVerticalIcon } from "@radix-ui/react-icons";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const t = useTranslations("menu");

  const { user, loaded } = useSession();
  const email = user?.email ?? "";
  const fullName = user?.name ?? "";
  const avatar = user?.image ?? "";
  const isLoading = !loaded;

  const handleLogOut = async () => {
    try {
      // Catat log logout ke database sebelum sesi dihapus
      const { logoutAction } = await import("@/app/actions/auth");
      await logoutAction();

      await supabase.auth.signOut();

      localStorage.removeItem("active_org_id");

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Gagal keluar akun:", error);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="justify-center">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="cursor-pointer border">
                {}
                {avatar ? (
                  <AvatarImage src={avatar} alt={fullName} className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(fullName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">{fullName}</span>
                <span className="text-muted-foreground truncate text-xs">{email}</span>
              </div>
              <DotsVerticalIcon className="ms-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                <Avatar className="cursor-pointer border">
                  {}
                  {avatar ? (
                    <AvatarImage src={avatar} alt={fullName} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(fullName)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-medium">{fullName}</span>
                  <span className="text-muted-foreground truncate text-xs">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings/general" className="cursor-pointer">
                  <UserCircle2Icon className="me-2 h-4 w-4" />
                  {t("account")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogOut}
              className="text-destructive focus:text-destructive cursor-pointer">
              <LogOutIcon className="me-2 h-4 w-4" />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
