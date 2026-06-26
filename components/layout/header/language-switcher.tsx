"use client";

import * as React from "react";
import { useState } from "react";
import { Languages, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Impor Global Language Hook & Kamus dari Provider Anda
import { useLanguage, LanguageType, dictionaries } from "@/components/providers/language-provider";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handler penggantian bahasa global (Sudah disamakan namanya)
  const handleLanguageChange = async (newLang: LanguageType) => {
    if (newLang === language) return;

    setIsLoading(true);
    setIsUpdating(true);
    try {
      // Simpan bahasa baru ke Supabase Auth & LocalState sekaligus
      await setLanguage(newLang);
    } catch (error) {
      console.error("Gagal mengganti bahasa:", error);
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isLoading || isUpdating}
          className="text-muted-foreground hover:text-foreground relative h-9 w-9 rounded-full transition-colors"
          title="Change Language">
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-border/80 min-w-44 rounded-xl border shadow-md">
        {/* Melakukan looping dinamis dari semua bahasa terdaftar di kamus terjemahan */}
        {Object.keys(dictionaries).map((langName) => (
          <DropdownMenuItem
            key={langName}
            onClick={() => handleLanguageChange(langName as LanguageType)}
            className="hover:bg-accent flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium">
            <span>{langName}</span>
            {language === langName && <Check className="h-4 w-4 text-emerald-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
