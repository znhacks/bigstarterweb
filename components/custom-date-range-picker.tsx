"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import {
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfDay,
  endOfDay,
  startOfYear,
  startOfWeek
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDateFnsLocale } from "@/lib/i18n/weekStart";
import { formatDateTime } from "@/lib/i18n/format";
import { getLocaleMeta } from "@/config/i18n-culture";

const dateFilterPresets = [
  { name: "Today", value: "today" },
  { name: "Yesterday", value: "yesterday" },
  { name: "This Week", value: "thisWeek" },
  { name: "Last 7 Days", value: "last7Days" },
  { name: "Last 28 Days", value: "last28Days" },
  { name: "This Month", value: "thisMonth" },
  { name: "Last Month", value: "lastMonth" },
  { name: "This Year", value: "thisYear" }
];

interface CalendarDateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export default function CalendarDateRangePicker({
  className,
  date,
  setDate
}: CalendarDateRangePickerProps) {
  const isMobile = useIsMobile();
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());

  const meta = getLocaleMeta(locale);

  const getPresetLabel = (value: string, defaultName: string) => {
    const labels: Record<string, Record<string, string>> = {
      today: { en: "Today", id: "Hari Ini", ar: "اليوم" },
      yesterday: { en: "Yesterday", id: "Kemarin", ar: "أمس" },
      thisWeek: { en: "This Week", id: "Minggu Ini", ar: "هذا الأسبوع" },
      last7Days: { en: "Last 7 Days", id: "7 Hari Terakhir", ar: "آخر ٧ أيام" },
      last28Days: { en: "Last 28 Days", id: "28 Hari Terakhir", ar: "آخر ٢٨ يومًا" },
      thisMonth: { en: "This Month", id: "Bulan Ini", ar: "هذا الشهر" },
      lastMonth: { en: "Last Month", id: "Bulan Lalu", ar: "الشهر الماضي" },
      thisYear: { en: "This Year", id: "Tahun Ini", ar: "هذه السنة" }
    };
    return labels[value]?.[locale] ?? defaultName;
  };

  const handleQuickSelect = (from: Date, to: Date) => {
    setDate({ from, to });
    setCurrentMonth(from);
  };

  const changeHandle = (type: string) => {
    const today = new Date();
    const dateFnsLocale = getDateFnsLocale(locale);

    switch (type) {
      case "today":
        handleQuickSelect(startOfDay(today), endOfDay(today));
        break;
      case "yesterday":
        const yesterday = subDays(today, 1);
        handleQuickSelect(startOfDay(yesterday), endOfDay(yesterday));
        break;
      case "thisWeek":
        const startOfCurrentWeek = startOfWeek(today, { locale: dateFnsLocale });
        handleQuickSelect(startOfDay(startOfCurrentWeek), endOfDay(today));
        break;
      case "last7Days":
        const sevenDaysAgo = subDays(today, 6);
        handleQuickSelect(startOfDay(sevenDaysAgo), endOfDay(today));
        break;
      case "last28Days":
        const twentyEightDaysAgo = subDays(today, 27);
        handleQuickSelect(startOfDay(twentyEightDaysAgo), endOfDay(today));
        break;
      case "thisMonth":
        handleQuickSelect(startOfMonth(today), endOfDay(today));
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        handleQuickSelect(startOfMonth(lastMonth), endOfMonth(lastMonth));
        break;
      case "thisYear":
        const startOfCurrentYear = startOfYear(today);
        handleQuickSelect(startOfDay(startOfCurrentYear), endOfDay(today));
        break;
    }
  };

  const renderFormattedRange = (range: DateRange | undefined) => {
    if (!range?.from) {
      const placeholders: Record<string, string> = {
        en: "Select date range",
        id: "Pilih rentang tanggal",
        ar: "اختر نطاق التاريخ"
      };
      return <span>{placeholders[locale] ?? placeholders["en"]}</span>;
    }

    const formatCleanDate = (d: Date) => {
      return formatDateTime(d, locale, {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    };

    const fromStr = formatCleanDate(range.from);
    if (!range.to) return fromStr;

    const toStr = formatCleanDate(range.to);

    if (fromStr === toStr) {
      return fromStr;
    }

    return `${fromStr} - ${toStr}`;
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {isMobile ? (
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "justify-start text-start font-normal",
                        !date && "text-muted-foreground"
                      )}>
                      <CalendarIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent dir={meta.dir}>{renderFormattedRange(date)}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-start font-normal",
                !date && "text-muted-foreground"
              )}>
              <CalendarIcon className="me-2 h-4 w-4" />
              {renderFormattedRange(date)}
            </Button>
          )}
        </PopoverTrigger>
        {}
        <PopoverContent className="w-auto" align="end" dir={meta.dir}>
          <div className="flex flex-col lg:flex-row">
            <div className="me-0 lg:me-4">
              <ToggleGroup
                type="single"
                defaultValue="last28Days"
                className="hidden w-36 flex-col lg:block">
                {dateFilterPresets.map((item, key: number) => (
                  <ToggleGroupItem
                    key={key}
                    className="text-muted-foreground hover:bg-muted w-full justify-start rounded-md"
                    value={item.value}
                    onClick={() => changeHandle(item.value)}
                    asChild>
                    <Button variant="ghost" className="w-full justify-start font-normal">
                      {}
                      {getPresetLabel(item.value, item.name)}
                    </Button>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Select
                defaultValue="last28Days"
                onValueChange={(value: string) => changeHandle(value)}>
                <SelectTrigger
                  className="mb-4 flex w-full lg:hidden"
                  size="sm"
                  aria-label="Select a value">
                  {}
                  <SelectValue placeholder={getPresetLabel("last28Days", "Last 28 Days")} />
                </SelectTrigger>
                <SelectContent>
                  {dateFilterPresets.map((item, key: number) => (
                    <SelectItem key={key} value={item.value}>
                      {getPresetLabel(item.value, item.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {}
            <Calendar
              className="border-s-0 py-0! ps-0! pe-0! lg:border-s lg:ps-4!"
              mode="range"
              month={currentMonth}
              selected={date}
              onSelect={(newDate) => {
                setDate(newDate);
                if (newDate?.from) {
                  setCurrentMonth(newDate.from);
                }
              }}
              onMonthChange={setCurrentMonth}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
