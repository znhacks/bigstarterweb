"use client";

import React from "react";
import { School, Check, ChevronDown, ShieldCheck, UserCheck, AlertCircle } from "lucide-react";
import { useSchoolContext } from "@/hooks/use-school-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function SchoolRoleSwitcher() {
  const { userSchools, activeSchoolId, activeSchool, setActiveSchoolId, isLoading } =
    useSchoolContext();

  if (isLoading) {
    return <Skeleton className="h-9 w-40 rounded-lg" />;
  }

  if (!userSchools || userSchools.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>Belum Ada Sekolah</span>
      </div>
    );
  }

  const currentRole = activeSchool?.role || "Guru";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 gap-2 border-border/80 bg-background/80 hover:bg-accent hover:text-accent-foreground transition-all">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <School className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-left max-w-[180px] sm:max-w-[220px]">
            <span className="font-semibold truncate">
              {activeSchool?.school_name || "Pilih Sekolah"}
            </span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 font-medium shrink-0 bg-primary/10 text-primary border-primary/20">
              {currentRole}
            </Badge>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ms-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px] p-1">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5">
          Pilih Sekolah & Peran
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        <div className="max-h-[280px] overflow-y-auto space-y-1">
          {userSchools.map((item) => {
            const isSelected = item.school_id === activeSchoolId;
            return (
              <DropdownMenuItem
                key={item.school_id}
                onClick={() => setActiveSchoolId(item.school_id)}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  isSelected ? "bg-primary/10 text-primary font-medium" : ""
                }`}>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs font-semibold truncate text-foreground">
                    {item.school_name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {item.role.toLowerCase().includes("admin") ? (
                      <ShieldCheck className="h-3 w-3 text-amber-500 shrink-0" />
                    ) : (
                      <UserCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-[11px] text-muted-foreground truncate">
                      {item.role} {item.school_code ? `(${item.school_code})` : ""}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
