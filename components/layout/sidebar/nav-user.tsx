"use client";

import * as React from "react";
import { useEffect, useState } from "react";
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

// Impor klien Supabase Anda
import { supabase } from "@/lib/supabase";

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();

  // State data user & profil
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk memuat data user yang aktif dari Supabase
  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) return;

      setEmail(user.email || "");

      // Mengambil nama lengkap dari tabel profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setFullName(profileData.full_name);
      } else {
        // Fallback jika profile belum terbuat, gunakan nama metadata atau pangkas email
        setFullName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
      }
    } catch (error) {
      console.error("Gagal memuat profil pengguna:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // Handler fungsi keluar akun (Sign Out)
  const handleLogOut = async () => {
    try {
      await supabase.auth.signOut();

      // Bersihkan juga ID organisasi aktif dari penyimpanan lokal
      localStorage.removeItem("active_org_id");

      // Redirect ke halaman login v2
      router.push("/dashboard/login");
      router.refresh();
    } catch (error) {
      console.error("Gagal keluar akun:", error);
    }
  };

  // Helper untuk menghasilkan inisial nama secara otomatis (misal: "John Doe" -> "JD")
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
              <Avatar className="rounded-full">
                {/* Fallback inisial jika avatar tidak ada */}
                <AvatarFallback className="bg-primary/10 text-primary rounded-full text-xs font-semibold">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{fullName}</span>
                <span className="text-muted-foreground truncate text-xs">{email}</span>
              </div>
              <DotsVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarFallback className="bg-primary/10 text-primary rounded-full text-xs font-semibold">
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{fullName}</span>
                  <span className="text-muted-foreground truncate text-xs">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer">
                <UserCircle2Icon className="mr-2 h-4 w-4" />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogOut}
              className="text-destructive focus:text-destructive cursor-pointer">
              <LogOutIcon className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
