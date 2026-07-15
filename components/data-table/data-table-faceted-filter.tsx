"use client";

import * as React from "react";
import { PlusCircle } from "lucide-react";
import { Column } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DataTableFacetedFilterOption {
  value: string;
  label: string;
}

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title: string;
  options: DataTableFacetedFilterOption[];
  emptyText?: string;
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  emptyText = "No results found."
}: DataTableFacetedFilterProps<TData, TValue>) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>(
    (column?.getFilterValue() as string[]) || []
  );
  const [temp, setTemp] = React.useState<string[]>(selected);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTemp(selected);
    } else {
      setSelected(temp);
      column?.setFilterValue(temp.length > 0 ? temp : undefined);
    }
    setOpen(next);
  };

  const toggle = (value: string) => {
    setTemp((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 text-xs">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ms-2 rounded-sm px-1 font-normal lg:hidden">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="border-border/80 w-52 rounded-xl border p-0" align="start">
        <Command>
          <CommandInput placeholder={title} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggle(option.value)}>
                  <div className="flex w-full cursor-pointer items-center gap-3 py-1">
                    <Checkbox
                      id={`${title}-${option.value}`}
                      checked={temp.includes(option.value)}
                      onCheckedChange={() => toggle(option.value)}
                    />
                    <label
                      htmlFor={`${title}-${option.value}`}
                      className="cursor-pointer text-sm leading-none font-medium">
                      {option.label}
                    </label>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
