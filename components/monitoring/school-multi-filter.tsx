"use client";

import React from "react";
import { Filter, Check, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface SchoolFilterOption {
  id: string;
  name: string;
  code: string;
}

interface SchoolMultiFilterProps {
  schools: SchoolFilterOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export function SchoolMultiFilter({
  schools,
  selectedIds,
  onChange
}: SchoolMultiFilterProps) {
  if (!schools || schools.length <= 1) {
    return null;
  }

  const isAllSelected = selectedIds.length === 0 || selectedIds.length === schools.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onChange(schools.map((s) => s.id));
    } else {
      onChange([]);
    }
  };

  const handleToggleSchool = (id: string, checked: boolean) => {
    if (checked) {
      const next = [...selectedIds, id];
      onChange(next.length === schools.length ? [] : next);
    } else {
      const current = selectedIds.length === 0 ? schools.map((s) => s.id) : selectedIds;
      const next = current.filter((item) => item !== id);
      onChange(next);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-border/80 gap-2 bg-background">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Filter Sekolah</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold bg-primary/10 text-primary">
            {isAllSelected ? "Semua Sekolah" : `${selectedIds.length} Terpilih`}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-3 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <span className="text-xs font-bold text-foreground">Filter Pemantauan</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground">
            Reset
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2 py-1 px-1 rounded hover:bg-accent/40">
            <Checkbox
              id="select-all-schools"
              checked={isAllSelected}
              onCheckedChange={(c) => handleSelectAll(!!c)}
            />
            <Label htmlFor="select-all-schools" className="text-xs font-semibold cursor-pointer">
              Semua Sekolah (Agregasi Data)
            </Label>
          </div>

          <div className="border-t border-border/40 my-1 pt-1 space-y-1 max-h-[200px] overflow-y-auto">
            {schools.map((school) => {
              const checked = isAllSelected || selectedIds.includes(school.id);
              return (
                <div
                  key={school.id}
                  className="flex items-center space-x-2 py-1.5 px-1 rounded hover:bg-accent/40">
                  <Checkbox
                    id={`school-${school.id}`}
                    checked={checked}
                    onCheckedChange={(c) => handleToggleSchool(school.id, !!c)}
                  />
                  <Label
                    htmlFor={`school-${school.id}`}
                    className="text-xs flex items-center gap-1.5 cursor-pointer font-normal truncate">
                    <School className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{school.name}</span>
                    {school.code && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({school.code})
                      </span>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
