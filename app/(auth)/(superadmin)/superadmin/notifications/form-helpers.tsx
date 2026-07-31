"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const EDITABLE_LOCALES = ["en", "id", "ar"] as const;
export type EditableLocale = (typeof EDITABLE_LOCALES)[number];

/** Bagian collapsible ala form Plans (tombol header penuh + chevron). */
export function Section({
  open,
  onToggle,
  title,
  error,
  children
}: {
  open: boolean;
  onToggle: () => void;
  title: React.ReactNode;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden">
      <Button
        type="button"
        onClick={onToggle}
        className={`bg-dropdown/50 hover:bg-dropdown flex w-full items-center justify-between border text-left transition-colors ${
          error ? "border-destructive/50" : ""
        }`}>
        <span className="text-foreground flex items-center gap-2 text-sm font-semibold">
          {title}
          {error && <span className="bg-destructive inline-block h-2 w-2 rounded-full" />}
        </span>
        {open ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        )}
      </Button>
      {open && <div className="space-y-6 p-5">{children}</div>}
    </div>
  );
}

/** Tab bahasa dengan progress bar — persis seperti form Plans. */
export function LanguageTabs({
  status,
  active,
  onChange,
  completedCount,
  total,
  languageLabel,
  filledLabel
}: {
  status: { code: string; isFilled: boolean }[];
  active: string;
  onChange: (code: string) => void;
  completedCount: number;
  total: number;
  languageLabel: string;
  filledLabel: string;
}) {
  return (
    <div className="space-y-3 border-b pb-4">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
          {languageLabel}
        </Label>
        <span className="text-muted-foreground text-xs font-semibold">
          {completedCount} / {total} {filledLabel}
        </span>
      </div>

      <div className="bg-muted/40 h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${(completedCount / total) * 100}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {status.map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => onChange(s.code)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase transition-all ${
              active === s.code
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/20 hover:bg-muted/40 text-muted-foreground border-border/60"
            }`}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                s.isFilled ? "bg-emerald-500" : "bg-muted-foreground/30"
              }`}
            />
            {s.code}
          </button>
        ))}
      </div>
    </div>
  );
}
