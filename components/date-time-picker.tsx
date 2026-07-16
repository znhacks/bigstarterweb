// components/ui/date-time-picker.tsx
"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatDateTime, formatNumber } from "@/lib/i18n/format";
import { getLocaleMeta } from "@/config/i18n-culture";

type Props = {
  date: Date | undefined;
  setDate: (value: Date | undefined) => void;
  showDate?: boolean; // Prop penentu visibilitas penanggalan tanggal (default: true)
  showTime?: boolean; // Prop penentu visibilitas pemilih waktu jam (default: true)
};

export function DateTimePicker({ date, setDate, showDate = true, showTime = true }: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const locale = useLocale();

  // Membaca metadata arah layout (RTL / LTR) murni dari Single Source of Truth
  const meta = getLocaleMeta(locale);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Jika penampil waktu aktif dan kita sudah memiliki jam terpilih sebelumnya, pertahankan nilai jam tersebut
      if (showTime && date) {
        selectedDate.setHours(date.getHours());
        selectedDate.setMinutes(date.getMinutes());
      }
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (type: "hour" | "minute" | "ampm", value: string) => {
    // Skenario aman: jika date bernilai undefined (TimePicker saja), inisialisasi menggunakan tanggal hari ini
    const baseDate = date ? new Date(date) : new Date();

    if (type === "hour") {
      baseDate.setHours((parseInt(value) % 12) + (baseDate.getHours() >= 12 ? 12 : 0));
    } else if (type === "minute") {
      baseDate.setMinutes(parseInt(value));
    } else if (type === "ampm") {
      const currentHours = baseDate.getHours();
      baseDate.setHours(value === "PM" ? currentHours + 12 : currentHours - 12);
    }
    setDate(baseDate);
  };

  // Menerjemahkan Label AM/PM secara kustom peka-kultur
  const getAmPmLabel = (ampm: "AM" | "PM") => {
    if (locale === "ar") {
      return ampm === "AM" ? "ص" : "م";
    }
    return ampm;
  };

  // Menentukan opsi pemformatan Intl berdasarkan properti visibilitas yang aktif
  const getFormatOptions = (): Intl.DateTimeFormatOptions => {
    const options: Intl.DateTimeFormatOptions = {};
    if (showDate) {
      options.year = "numeric";
      options.month = "2-digit";
      options.day = "2-digit";
    }
    if (showTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.hour12 = true;
    }
    return options;
  };

  const getPlaceholder = () => {
    if (showDate && showTime) {
      return locale === "ar" ? "DD/MM/YYYY hh:mm aa" : "MM/DD/YYYY hh:mm aa";
    }
    if (showDate) {
      return locale === "ar" ? "DD/MM/YYYY" : "MM/DD/YYYY";
    }
    return "hh:mm aa";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-start font-normal",
            !date && "text-muted-foreground"
          )}>
          <CalendarIcon className="me-2 h-4 w-4" />
          {date ? (
            formatDateTime(date, locale, getFormatOptions())
          ) : (
            <span>{getPlaceholder()}</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" dir={meta.dir} align="start">
        <div className="sm:flex">
          {/* RENDER KONDISIONAL: Tampilkan kalender hanya jika showDate bernilai TRUE */}
          {showDate && (
            <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
          )}

          {/* RENDER KONDISIONAL: Tampilkan pemilih waktu hanya jika showTime bernilai TRUE */}
          {showTime && (
            <div
              className={cn(
                "flex h-[300px] flex-col divide-y sm:flex-row sm:divide-x sm:divide-y-0",
                // Berikan pembatas border kiri hanya jika kalender tanggal juga sedang ditampilkan
                showDate && "border-s"
              )}>
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex p-2 sm:flex-col">
                  {hours.reverse().map((hour) => (
                    <Button
                      key={hour}
                      size="icon"
                      variant={date && date.getHours() % 12 === hour % 12 ? "default" : "ghost"}
                      className="aspect-square shrink-0 sm:w-full"
                      onClick={() => handleTimeChange("hour", hour.toString())}>
                      {formatNumber(hour, locale)}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>

              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex p-2 sm:flex-col">
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                    <Button
                      key={minute}
                      size="icon"
                      variant={date && date.getMinutes() === minute ? "default" : "ghost"}
                      className="aspect-square shrink-0 sm:w-full"
                      onClick={() => handleTimeChange("minute", minute.toString())}>
                      {formatNumber(minute, locale, { minimumIntegerDigits: 2 })}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>

              <ScrollArea className="">
                <div className="flex p-2 sm:flex-col">
                  {["AM", "PM"].map((ampm) => (
                    <Button
                      key={ampm}
                      size="icon"
                      variant={
                        date &&
                        ((ampm === "AM" && date.getHours() < 12) ||
                          (ampm === "PM" && date.getHours() >= 12))
                          ? "default"
                          : "ghost"
                      }
                      className="aspect-square shrink-0 font-medium sm:w-full"
                      onClick={() => handleTimeChange("ampm", ampm)}>
                      {getAmPmLabel(ampm as "AM" | "PM")}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
