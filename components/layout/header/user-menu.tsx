"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, ChevronRightIcon, LogOut, Sparkles, Loader2 } from "lucide-react";

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
import Link from "next/link";
import { Progress } from "@/components/ui/progress";

// Impor klien Supabase Anda
import { supabase } from "@/lib/supabase";

export default function UserMenu() {
  const router = useRouter();

  // State data user & profil
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatar, setAvatar] = useState(""); // Menyimpan URL avatar dari database
  const [isLoading, setIsLoading] = useState(true);

  // Memuat data user dari Supabase
  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) return;

      setEmail(user.email || "");

      // Mengambil nama lengkap & URL avatar secara nyata dari tabel profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar") // <-- Memuat kolom avatar dari database
        .eq("id", user.id)
        .single();

      if (profileData) {
        setFullName(profileData.full_name);
        setAvatar(profileData.avatar || ""); // Menyimpan URL avatar ke state
      } else {
        // Fallback jika profile belum ada
        setFullName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
        setAvatar("");
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

  // Handler keluar akun (Log out)
  const handleLogOut = async () => {
    try {
      await supabase.auth.signOut();

      // Bersihkan juga ID organisasi aktif dari penyimpanan lokal
      localStorage.removeItem("active_org_id");

      // Redirect ke halaman login v2
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Gagal keluar akun:", error);
    }
  };

  // Helper untuk menghasilkan inisial nama secara otomatis (misal: "Daffa Ryadi" -> "DR")
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
      <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full border">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer border">
          {/* RENDER AVATAR USER DARI SUPABASE JIKA ADA */}
          {avatar ? (
            <AvatarImage src={avatar} alt={fullName} className="object-cover" />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {getInitials(fullName)}
            </AvatarFallback>
          )}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-60" align="end">
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="border">
              {avatar ? (
                <AvatarImage src={avatar} alt={fullName} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {getInitials(fullName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="text-foreground truncate font-semibold">{fullName}</span>
              <span className="text-muted-foreground truncate text-xs">{email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="https://shadcnuikit.com/pricing" target="_blank">
              <Sparkles className="mr-2 h-4 w-4 text-amber-500" /> Upgrade to Pro
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer">
            <BadgeCheck className="mr-2 h-4 w-4" />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogOut}
          className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
        <div className="bg-muted mt-1.5 rounded-md border">
          <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Credits</h4>
              <div className="text-muted-foreground flex cursor-pointer items-center text-sm">
                <span>5 left</span>
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </div>
            </div>
            <Progress value={40} indicatorColor="bg-primary" />
            <div className="text-muted-foreground flex items-center text-sm text-[11px]">
              Daily credits used first
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
