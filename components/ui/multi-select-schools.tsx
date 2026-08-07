"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, X, School as SchoolIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { jurnalMengajarSupabase } from "@/lib/jurnalmengajar-supabase";
import type { SchoolOption } from "@/interfaces/school";

interface MultiSelectSchoolsProps {
  value: string[]; // List of selected school codes or IDs
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelectSchools({
  value = [],
  onChange,
  placeholder = "Pilih 2 atau lebih sekolah...",
  disabled = false
}: MultiSelectSchoolsProps) {
  const [open, setOpen] = useState(false);
  const [availableSchools, setAvailableSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [customInput, setCustomInput] = useState("");

  useEffect(() => {
    async function loadSchools() {
      try {
        setLoading(true);
        const { data, error } = await jurnalMengajarSupabase
          .from("schools")
          .select("id, name, code, npsn");

        if (!error && data) {
          const formatted: SchoolOption[] = data.map((s: any) => ({
            id: s.id.toString(),
            name: s.name || s.code || `Sekolah ${s.id}`,
            code: s.code || s.npsn || s.id.toString()
          }));
          setAvailableSchools(formatted);
        }
      } catch (err) {
        console.warn("Failed to load schools from Jurnal Mengajar DB:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSchools();
  }, []);

  const toggleSelect = (codeOrId: string) => {
    if (value.includes(codeOrId)) {
      onChange(value.filter((v) => v !== codeOrId));
    } else {
      onChange([...value, codeOrId]);
    }
  };

  const removeTag = (codeOrId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== codeOrId));
  };

  const addCustomCode = () => {
    const trimmed = customInput.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setCustomInput("");
    }
  };

  const getLabel = (codeOrId: string) => {
    const found = availableSchools.find((s) => s.code === codeOrId || s.id === codeOrId);
    return found ? `${found.name} (${found.code})` : codeOrId;
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full min-h-[42px] h-auto py-2 px-3 justify-between font-normal bg-background border-border/80 hover:bg-accent/40">
            <div className="flex flex-wrap gap-1.5 items-center">
              {value.length === 0 ? (
                <span className="text-muted-foreground text-xs">{placeholder}</span>
              ) : (
                value.map((codeOrId) => (
                  <Badge
                    key={codeOrId}
                    variant="secondary"
                    className="text-xs px-2 py-0.5 font-medium bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                    <SchoolIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[160px]">{getLabel(codeOrId)}</span>
                    <button
                      type="button"
                      onClick={(e) => removeTag(codeOrId, e)}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground ms-2" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[320px] sm:w-[400px] p-0">
          <Command>
            <CommandInput
              placeholder="Cari nama atau kode sekolah..."
              value={customInput}
              onValueChange={setCustomInput}
            />
            <CommandList className="max-h-[240px] overflow-y-auto">
              <CommandEmpty className="p-3 text-xs text-center text-muted-foreground">
                {customInput ? (
                  <div className="space-y-2">
                    <p>Sekolah tidak ditemukan di direktori.</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addCustomCode}
                      className="h-8 text-xs font-medium gap-1">
                      <Plus className="h-3.5 w-3.5" /> Tambah Kode Kode &quot;{customInput}&quot;
                    </Button>
                  </div>
                ) : (
                  "Tidak ada sekolah tersedia."
                )}
              </CommandEmpty>

              <CommandGroup heading="Daftar Sekolah Tersedia">
                {availableSchools.map((school) => {
                  const key = school.code || school.id;
                  const isSelected = value.includes(key) || value.includes(school.id);
                  return (
                    <CommandItem
                      key={school.id}
                      value={`${school.name} ${school.code}`}
                      onSelect={() => toggleSelect(key)}
                      className="flex items-center justify-between p-2 text-xs cursor-pointer">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-semibold text-foreground truncate">
                          {school.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Kode: {school.code}
                        </span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ms-2" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {value.length} sekolah terpilih untuk pemantauan multi-sekolah.
        </p>
      )}
    </div>
  );
}
