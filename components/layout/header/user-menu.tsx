"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  ChevronRightIcon,
  LogOut,
  Sparkles,
  Loader2,
  UserCircle2Icon
} from "lucide-react";

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

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";
import { useTranslations } from "next-intl";

export default function UserMenu() {
  const router = useRouter();

  const { user: sessionUser, loaded } = useSession();
  const email = sessionUser?.email ?? "";
  const fullName = sessionUser?.name ?? "";
  const avatar = sessionUser?.image ?? "";
  const isLoading = !loaded;
  const t = useTranslations("menu");

  const handleLogOut = async () => {
    try {
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
      <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full border">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-60" align="end">
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
            <Avatar className="border">
              {avatar ? (
                <AvatarImage src={avatar} alt={fullName} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {getInitials(fullName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="text-foreground truncate font-semibold">{fullName}</span>
              <span className="text-muted-foreground truncate text-xs">{email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="https://bigstarter.vercel.app/pricing" target="_blank">
              <Sparkles className="me-2 h-4 w-4 text-amber-500" /> {t("upgradetopro")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
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
          <LogOut className="me-2 h-4 w-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
