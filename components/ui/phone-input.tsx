// components/ui/phone-input.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";

type PhoneInputProps = Omit<React.ComponentPropsWithoutRef<"input">, "onChange" | "value"> & {
  value?: RPNInput.Value;
  onChange?: (value?: RPNInput.Value) => void;
  defaultCountry?: RPNInput.Country;
};

const PhoneInput = React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
  ({ className, onChange, value, defaultCountry = "US", ...props }, ref) => {
    return (
      <RPNInput.default
        ref={ref}
        className={cn("flex rounded-md", className)}
        flagComponent={FlagComponent}
        countrySelectComponent={CountrySelect}
        inputComponent={InputComponent}
        placeholder={props.placeholder ?? "Enter phone number"}
        value={value}
        // SOLUSI: Menghindari ketidakcocokan tipe data "undefined"
        onChange={onChange ?? (() => {})}
        defaultCountry={defaultCountry}
        {...props}
      />
    );
  }
);
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <Input
      className={cn("rounded-s-none rounded-e-md focus-visible:z-10", className)}
      ref={ref}
      {...props}
    />
  )
);
InputComponent.displayName = "InputComponent";

type CountrySelectOption = { label: string; value: RPNInput.Country };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  onChange: (value: RPNInput.Country) => void;
  options: CountrySelectOption[];
};

const CountrySelect = ({ disabled, value, onChange, options }: CountrySelectProps) => {
  const [open, setOpen] = React.useState(false);

  const handleSelect = React.useCallback(
    (country: RPNInput.Country) => {
      onChange(country);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "focus:ring-ring flex gap-1 rounded-s-md rounded-e-none px-3 focus:ring-1 focus-visible:z-10"
          )}
          disabled={disabled}>
          <FlagComponent country={value} countryName={value} />
          <ChevronsUpDown
            className={cn("-mr-2 h-4 w-4 shrink-0 opacity-50", disabled ? "hidden" : "block")}
          />
        </Button>
      </PopoverTrigger>
      {/* SOLUSI: Mengganti w-[300px] dengan kelas kanonik Tailwind v4 w-75 */}
      <PopoverContent className="w-75 p-0" align="start">
        <Command>
          <CommandList>
            <CommandInput placeholder="Search country..." />
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {options
                .filter((x) => x.value)
                .map((option) => (
                  <CommandItem
                    className="gap-2"
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}>
                    <FlagComponent country={option.value} countryName={option.label} />
                    <span className="flex-1 text-sm font-medium">{option.label}</span>
                    {option.value && (
                      <span className="text-muted-foreground text-xs">
                        +{RPNInput.getCountryCallingCode(option.value)}
                      </span>
                    )}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        option.value === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="bg-muted flex h-4 w-6 shrink-0 items-center justify-center overflow-hidden rounded-xs">
      {Flag ? (
        // SOLUSI: Menghilangkan properti className pada <Flag> dan membungkusnya dalam span penata gaya
        <span className="h-full w-full object-cover [&>svg]:h-full [&>svg]:w-full">
          <Flag title={countryName} />
        </span>
      ) : (
        <span className="text-[10px] font-bold">{country}</span>
      )}
    </span>
  );
};
FlagComponent.displayName = "FlagComponent";

export { PhoneInput };
