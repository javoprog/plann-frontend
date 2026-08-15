"use client";

import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  value?: Date;
  onChange: (date?: Date) => void;
  placeholder?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
}: DatePickerProps) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start font-normal",
              !value && "text-muted-foreground",
            )}
          />
        }
      >
        <CalendarDays className="size-4" />
        {value
          ? new Intl.DateTimeFormat(language, {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(value)
          : placeholder}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        sideOffset={4}
        align="start"
        className="w-auto"
      >
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(date) => {
            onChange(date);
            if (date) setOpen(false);
          }}
        />
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-full"
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
          >
            <X className="size-3.5" /> {t("actions.clearDate")}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
