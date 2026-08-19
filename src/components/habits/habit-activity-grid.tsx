"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLocalDateKey } from "@/lib/format";
import type { Habit, HabitFrequency } from "@/lib/types";
import { cn } from "@/lib/utils";

export function isHabitScheduled(
  date: Date,
  frequency: HabitFrequency,
) {
  const weekday = date.getDay();
  if (frequency === "WEEKDAYS") return weekday >= 1 && weekday <= 5;
  if (frequency === "WEEKENDS") return weekday === 0 || weekday === 6;
  return true;
}

export function getLastThirtyDays(today = new Date()) {
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (29 - index));
    return date;
  });
}

interface HabitActivityGridProps {
  habit: Habit;
  updatingDate?: string | null;
  onToggle: (date: string) => void;
}

export function HabitActivityGrid({
  habit,
  updatingDate,
  onToggle,
}: HabitActivityGridProps) {
  const { language, t } = useLanguage();
  const completedDates = new Set(
    habit.logs.filter((log) => log.completed).map((log) => log.date),
  );

  return (
    <div
      className="grid grid-cols-10 gap-2 sm:grid-cols-[repeat(15,minmax(0,1fr))]"
      aria-label={t("habits.activityLast30Days")}
    >
      {getLastThirtyDays().map((date) => {
        const dateKey = getLocalDateKey(date);
        const completed = completedDates.has(dateKey);
        const scheduled = isHabitScheduled(date, habit.frequency);
        const label = new Intl.DateTimeFormat(language, {
          month: "short",
          day: "numeric",
        }).format(date);

        const accessibleLabel = `${label}: ${
          completed ? t("common.completed") : t("common.notCompleted")
        }`;

        return (
          <Tooltip key={dateKey}>
            <TooltipTrigger
              render={
                <Toggle
                  variant="outline"
                  pressed={completed}
                  className={cn(
                    "aspect-square h-auto min-h-7 min-w-0 p-0",
                    completed &&
                      "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                    !scheduled && !completed && "border-dashed opacity-40",
                  )}
                  aria-label={accessibleLabel}
                  disabled={!scheduled || Boolean(updatingDate)}
                  onPressedChange={() => onToggle(dateKey)}
                />
              }
            />
            <TooltipContent>{accessibleLabel}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
